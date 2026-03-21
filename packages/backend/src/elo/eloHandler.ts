import { inject, injectable } from 'tsyringe';
import { EloRepository, type EloPlayerRating } from './eloRepository';

export interface EloMatchPlayerResult {
    profileId: string;
    score: 0 | 1;
}

export interface UpdatedEloPlayerRating extends EloPlayerRating {
    eloChange: number;
}

const PROVISIONAL_GAMES_THRESHOLD = 10;
const PROVISIONAL_K_FACTOR = 30;
const ESTABLISHED_K_FACTOR = 15;
const MINIMUM_PLAYER_ELO = 100;

@injectable()
export class EloHandler {
    constructor(
        @inject(EloRepository) private readonly eloRepository: EloRepository
    ) { }

    async getPlayerRating(profileId: string | null): Promise<EloPlayerRating | null> {
        if (!profileId) {
            return null;
        }

        return this.eloRepository.getPlayerRating(profileId);
    }

    async applyRatedGameResult(
        playerResults: readonly [EloMatchPlayerResult, EloMatchPlayerResult]
    ): Promise<Map<string, UpdatedEloPlayerRating>> {
        if (playerResults[0].profileId === playerResults[1].profileId) {
            return new Map();
        }

        const currentRatings = await this.eloRepository.getPlayerRatings(playerResults.map((player) => player.profileId));
        if (currentRatings.size !== playerResults.length) {
            return new Map();
        }

        const [firstPlayer, secondPlayer] = playerResults.map((player) => {
            const rating = currentRatings.get(player.profileId);
            if (!rating) {
                throw new Error(`Missing ELO rating for player ${player.profileId}.`);
            }

            return {
                ...player,
                rating
            };
        });

        const firstExpectedScore = this.calculateExpectedScore(firstPlayer.rating.elo, secondPlayer.rating.elo);
        const secondExpectedScore = this.calculateExpectedScore(secondPlayer.rating.elo, firstPlayer.rating.elo);
        const firstNextElo = Math.max(
            MINIMUM_PLAYER_ELO,
            Math.round(firstPlayer.rating.elo + this.getKFactor(firstPlayer.rating.ratedGamesPlayed) * (firstPlayer.score - firstExpectedScore))
        );
        const secondNextElo = Math.max(
            MINIMUM_PLAYER_ELO,
            Math.round(secondPlayer.rating.elo + this.getKFactor(secondPlayer.rating.ratedGamesPlayed) * (secondPlayer.score - secondExpectedScore))
        );

        await this.eloRepository.updatePlayerRatings([
            {
                profileId: firstPlayer.profileId,
                elo: firstNextElo,
                ratedGamesPlayed: firstPlayer.rating.ratedGamesPlayed + 1
            },
            {
                profileId: secondPlayer.profileId,
                elo: secondNextElo,
                ratedGamesPlayed: secondPlayer.rating.ratedGamesPlayed + 1
            }
        ]);

        return new Map([
            [
                firstPlayer.profileId,
                {
                    elo: firstNextElo,
                    ratedGamesPlayed: firstPlayer.rating.ratedGamesPlayed + 1,
                    eloChange: firstNextElo - firstPlayer.rating.elo
                }
            ],
            [
                secondPlayer.profileId,
                {
                    elo: secondNextElo,
                    ratedGamesPlayed: secondPlayer.rating.ratedGamesPlayed + 1,
                    eloChange: secondNextElo - secondPlayer.rating.elo
                }
            ]
        ]);
    }

    private calculateExpectedScore(playerElo: number, opponentElo: number): number {
        return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    }

    private getKFactor(ratedGamesPlayed: number): number {
        return ratedGamesPlayed < PROVISIONAL_GAMES_THRESHOLD
            ? PROVISIONAL_K_FACTOR
            : ESTABLISHED_K_FACTOR;
    }
}
