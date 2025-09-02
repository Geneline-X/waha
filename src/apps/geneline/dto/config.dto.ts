import { IsString } from 'class-validator';

export class GenelineAppConfig {
  @IsString()
  apiUrl: string;

  @IsString()
  apiKey: string;

  @IsString()
  chatbotId: string;
}
