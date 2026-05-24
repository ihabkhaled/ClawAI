// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CostBudgetService } from '../services/cost-budget.service';

@Controller('routing/cost-budget')
export class CostBudgetController {
  constructor(private readonly service: CostBudgetService) {}

  @Get('me')
  async getMine(): Promise<unknown> {
    return this.service.getMine();
  }

  @Get('me/forecast')
  async getMineForecast(): Promise<unknown> {
    return this.service.getMineForecast();
  }

  @Patch('me')
  async updateMine(@Body() body: unknown): Promise<unknown> {
    return this.service.updateMine(body);
  }

  @Get()
  async listAll(): Promise<unknown> {
    return this.service.listAll();
  }

  @Post()
  async create(@Body() body: unknown): Promise<unknown> {
    return this.service.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    return this.service.update(id, body);
  }

  @Post('check')
  async check(@Body() body: unknown): Promise<unknown> {
    return this.service.check(body);
  }
}
