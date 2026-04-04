import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { type PaginatedResult } from "../../../common/types";
import { RoutingService } from "../services/routing.service";
import { CreatePolicyDto, createPolicySchema } from "../dto/create-policy.dto";
import { UpdatePolicyDto, updatePolicySchema } from "../dto/update-policy.dto";
import { ListPoliciesQueryDto, listPoliciesQuerySchema } from "../dto/list-policies-query.dto";
import { EvaluateRouteDto, evaluateRouteSchema } from "../dto/evaluate-route.dto";
import {
  type RoutingPolicy,
  type RoutingDecision,
  type RoutingDecisionResult,
} from "../types/routing.types";

@Controller("routing")
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post("policies")
  async createPolicy(
    @Body(new ZodValidationPipe(createPolicySchema)) dto: CreatePolicyDto,
  ): Promise<RoutingPolicy> {
    return this.routingService.createPolicy(dto);
  }

  @Get("policies")
  async getPolicies(
    @Query(new ZodValidationPipe(listPoliciesQuerySchema)) query: ListPoliciesQueryDto,
  ): Promise<PaginatedResult<RoutingPolicy>> {
    return this.routingService.getPolicies(query);
  }

  @Get("policies/:id")
  async getPolicy(@Param("id") id: string): Promise<RoutingPolicy> {
    return this.routingService.getPolicy(id);
  }

  @Patch("policies/:id")
  async updatePolicy(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePolicySchema)) dto: UpdatePolicyDto,
  ): Promise<RoutingPolicy> {
    return this.routingService.updatePolicy(id, dto);
  }

  @Delete("policies/:id")
  async deletePolicy(@Param("id") id: string): Promise<RoutingPolicy> {
    return this.routingService.deletePolicy(id);
  }

  @Post("evaluate")
  async evaluateRoute(
    @Body(new ZodValidationPipe(evaluateRouteSchema)) dto: EvaluateRouteDto,
  ): Promise<RoutingDecisionResult> {
    return this.routingService.evaluateRoute(dto);
  }

  @Get("decisions/:threadId")
  async getDecisions(
    @Param("threadId") threadId: string,
    @Query("page") page: string,
    @Query("limit") limit: string,
  ): Promise<PaginatedResult<RoutingDecision>> {
    return this.routingService.getDecisions(
      threadId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }
}
