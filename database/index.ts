import { Database } from '@nozbe/watermelondb';
import { getAdapter } from './adapter';

import Income from './models/Income';
import Expense from './models/Expense';
import Goal from './models/Goal';

// Create the Database object:
const database = new Database({
  adapter: getAdapter(),
  modelClasses: [
    Income,
    Expense,
    Goal
  ],
});

export default database;
