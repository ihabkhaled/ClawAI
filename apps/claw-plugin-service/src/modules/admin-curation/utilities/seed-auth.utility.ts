import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { type CuratedSeed } from '../constants/curated-seeds.constants';
import { type CuratedAuthBody } from '../dto/curation.dto';

/** The auth block of a seeded draft: no auth, an X-API-Key header, or an Authorization bearer token. */
export function seedAuth(kind: CuratedSeed['authKind']): CuratedAuthBody {
  if (kind === AuthKind.NONE) return { kind: AuthKind.NONE };
  return kind === AuthKind.API_KEY
    ? { kind: AuthKind.API_KEY, headerName: 'X-API-Key' }
    : { kind: AuthKind.BEARER_TOKEN, headerName: 'Authorization' };
}
