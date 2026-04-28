import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Expense extends Model {
  static table = 'expenses';

  @field('amount') amount!: number;
  @field('category') category!: string;
  @field('description') description?: string;
  @field('user_id') userId!: string;
  @field('currency') _currency?: string;
  @field('external_id') externalId?: string;

  get currency(): string {
    return this._currency || 'PHP';
  }

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
