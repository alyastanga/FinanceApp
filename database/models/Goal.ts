import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Goal extends Model {
  static table = 'goals';

  @field('name') name!: string;
  @field('target_amount') targetAmount!: number;
  @field('current_amount') currentAmount!: number;
  @field('target_completion_date') targetCompletionDate!: number;
  @field('sync_to_calendar') syncToCalendar!: boolean;
  @field('user_id') userId!: string;
  @field('currency') _currency?: string;

  get currency(): string {
    return this._currency || 'PHP';
  }

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
