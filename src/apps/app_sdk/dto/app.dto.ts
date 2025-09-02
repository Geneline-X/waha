import { ChatWootAppConfig } from '@waha/apps/chatwoot/dto/config.dto';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';

export type AllowedAppConfig = ChatWootAppConfig | GenelineAppConfig;

export enum AppName {
  chatwoot = 'chatwoot',
  geneline = 'geneline',
}

export class App<T extends AllowedAppConfig = any> {
  @IsString()
  id: string;

  @IsString()
  session: string;

  // App name (aka type)
  @IsEnum(AppName)
  app: AppName;

  @ValidateNested()
  @Type((options) => {
    if (options && options.object && options.object.app) {
      switch (options.object.app) {
        case AppName.chatwoot:
          return ChatWootAppConfig;
        case AppName.geneline:
          return GenelineAppConfig;
        default:
          return Object;
      }
    }
    return Object;
  })
  config: T;
}

export class ChatWootAppDto extends App<ChatWootAppConfig> {
  @Type(() => ChatWootAppConfig)
  config: ChatWootAppConfig;
}

export class GenelineAppDto extends App<GenelineAppConfig> {
  @Type(() => GenelineAppConfig)
  config: GenelineAppConfig;
}

export type AppDto = ChatWootAppDto | GenelineAppDto;
