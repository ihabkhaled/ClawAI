import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  PUBLIC_ARTIFACT_CACHE_CONTROL,
  PUBLIC_ARTIFACT_CONTENT_TYPE,
  PUBLIC_ARTIFACT_CSP,
  PUBLIC_ARTIFACT_ROBOTS,
} from '../constants/artifact.constants';
import { type PublicArtifactParamDto, publicArtifactParamSchema } from '../dto/artifact-params.dto';
import { ArtifactsService } from '../services/artifacts.service';

/**
 * The unauthenticated read. GET only; the global throttler applies.
 *
 * Always text/plain, whatever the artifact's declared type: an HTML or SVG
 * artifact shows its source and never runs. CSP `sandbox` and nosniff back
 * that up in case anything in front rewrites the type. `no-store` so a deleted
 * artifact stops resolving at once.
 */
@Controller('public/artifacts')
@Public()
export class PublicArtifactsController {
  constructor(private readonly artifacts: ArtifactsService) {}

  @Get(':publicId')
  @Header('Content-Type', PUBLIC_ARTIFACT_CONTENT_TYPE)
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', PUBLIC_ARTIFACT_CSP)
  @Header('X-Frame-Options', 'DENY')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('Cache-Control', PUBLIC_ARTIFACT_CACHE_CONTROL)
  @Header('Content-Disposition', 'inline')
  @Header('X-Robots-Tag', PUBLIC_ARTIFACT_ROBOTS)
  async read(
    @Param(new ZodValidationPipe(publicArtifactParamSchema)) params: PublicArtifactParamDto,
  ): Promise<string> {
    return this.artifacts.readPublic(params.publicId);
  }
}
