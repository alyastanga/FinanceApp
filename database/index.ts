import { Database } from '@nozbe/watermelondb';
import { getAdapter } from './adapter';

import Income from './models/Income';
import Expense from './models/Expense';
import Goal from './models/Goal';
import Budget from './models/Budget';
import Portfolio from './models/Portfolio';

// Create the Database object:
const database = new Database({
  adapter: getAdapter(),
  modelClasses: [
    Income,
    Expense,
    Goal,
    Budget,
    Portfolio
  ],
});

export default database;
