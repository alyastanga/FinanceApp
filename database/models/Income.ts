import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export default class Income extends Model {
  static table = 'incomes'

  @field('amount') amount!: number
  @field('source') source!: string
  @date('created_at') createdAt!: Date
}
