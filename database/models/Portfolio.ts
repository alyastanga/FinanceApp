import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Portfolio extends Model {
  static table = 'portfolio';

  @field('name') name!: string;
  @field('asset_type') assetType!: string;
  @field('symbol') symbol!: string;
  @field('quantity') quantity!: number;
  @field('invested_amount') investedAmount!: number;
  @field('value') value!: number;
  @field('change_24h') change24h!: number;
  @field('user_id') userId!: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
