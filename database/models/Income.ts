import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Income extends Model {
  static table = 'incomes';

  @field('amount') amount!: number;
  @field('source') source!: string;
  @field('user_id') userId!: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
