import { IsArray, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class WebhookMessageDto {
  @IsOptional()
  @IsObject()
  object?: any;

  @IsNotEmpty()
  @IsArray()
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product?: string;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          video?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          audio?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          document?: {
            mime_type: string;
            sha256: string;
            id: string;
            filename: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}
