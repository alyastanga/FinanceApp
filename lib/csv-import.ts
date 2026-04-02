import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import database from '../database';

export const importCSV = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
    });

    if (result.canceled) return;

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri);

    Papa.parse(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data } = results;
        
        await database.write(async () => {
          const incomeCollection = database.get('incomes');
          const expenseCollection = database.get('expenses');

          const recordsToCreate: any[] = [];

          data.forEach((row: any) => {
            try {
              const amount = parseFloat(row.Amount || row.amount);
              const type = (row.Type || row.type || '').toLowerCase();
              const label = row.Label || row.label || row.Source || row.Category || 'Imported';
              const dateStr = row.Date || row.date || new Date();

              if (isNaN(amount) || amount <= 0) return;

              if (type === 'income') {
                recordsToCreate.push(
                  incomeCollection.prepareCreate((income: any) => {
                    income.amount = amount;
                    income.source = label;
                    income.createdAt = new Date(dateStr);
                  })
                );
              } else if (type === 'expense') {
                recordsToCreate.push(
                  expenseCollection.prepareCreate((expense: any) => {
                    expense.amount = amount;
                    expense.category = label;
                    expense.createdAt = new Date(dateStr);
                  })
                );
              }
            } catch (rowError) {
              console.warn('Skipping corrupted row', row, rowError);
            }
          });

          if (recordsToCreate.length > 0) {
            await database.batch(...recordsToCreate);
            console.log(`Successfully imported ${recordsToCreate.length} records.`);
          }
        });
      },
      error: (error: any) => {
        console.error('CSV Parsing Error:', error);
      }
    });

  } catch (error) {
    console.error('File Pick Error:', error);
  }
};
