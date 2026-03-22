import 'vite/client';
import type { DehydratedState } from '@tanstack/react-query';

declare global {
  interface Window {
    __IH3T_DEHYDRATED_STATE__?: DehydratedState;
    __IH3T_RENDERED_AT__?: number;
  }
}
