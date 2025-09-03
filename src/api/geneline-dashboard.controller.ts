import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller()
export class GenelineDashboardController {
  @Get('/dashboard/geneline')
  @ApiExcludeEndpoint()
  async getGenelineDashboard(@Res() res: Response) {
    try {
      const filePath = join(process.cwd(), 'geneline-dashboard-tab.html');
      const content = readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } catch (error) {
      res.status(404).send('Geneline dashboard tab not found');
    }
  }

  @Get('/dashboard')
  @ApiExcludeEndpoint()
  async getDashboard(@Res() res: Response) {
    try {
      // Serve the SPA entry from the dashboard folder (works in dev and prod)
      // In dev: resolves to src/dashboard/index.html
      // In prod: resolves to dist/dashboard/index.html
      const filePath = join(__dirname, '..', 'dashboard', 'index.html');
      const content = readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } catch (error) {
      res.status(404).send('Dashboard not found');
    }
  }
}
