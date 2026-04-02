import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export default class Goal extends Model {
  static table = 'goals'

  @field('title') title!: string
  @field('target_amount') targetAmount!: number
  @field('saved_amount') savedAmount!: number
  @date('target_date') targetDate!: Date
  @date('created_at') createdAt!: Date
}
