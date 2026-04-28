import { generateCSV, ExportTransaction } from '../export-service';

describe('export-service', () => {
  describe('generateCSV', () => {
    it('should generate a correct CSV string with proper formatting', () => {
      const mockDate = new Date('2026-04-28T10:00:00Z').getTime();
      const transactions: ExportTransaction[] = [
        {
          amount: 250,
          category: 'Salary',
          description: 'Monthly pay',
          createdAt: mockDate,
          type: 'Inflow'
        },
        {
          amount: 15.50,
          category: 'Food',
          description: 'Lunch, with a comma',
          createdAt: mockDate + 3600000, // +1 hour
          type: 'Outflow'
        },
        {
          amount: 50,
          category: 'Gift',
          description: 'Birthday "Gift"',
          createdAt: mockDate + 7200000, // +2 hours
          type: 'Inflow'
        }
      ];

      const csv = generateCSV(transactions);
      const lines = csv.split('\n');

      // Check header
      expect(lines[0]).toBe('"Date & Time","Transaction Type","Category","Description","Amount"');

      // Check Inflow with +
      expect(lines[1]).toContain('"Inflow"');
      expect(lines[1]).toContain('"+250.00"');
      expect(lines[1]).toContain('"Monthly pay"');

      // Check Outflow with - and comma escaping
      expect(lines[2]).toContain('"Outflow"');
      expect(lines[2]).toContain('"-15.50"');
      expect(lines[2]).toContain('"Lunch, with a comma"');

      // Check Quote escaping
      expect(lines[3]).toContain('"Birthday ""Gift"""');
      expect(lines[3]).toContain('"+50.00"');
    });

    it('should handle empty descriptions', () => {
      const transactions: ExportTransaction[] = [
        {
          amount: 10,
          category: 'Test',
          description: null,
          createdAt: new Date().getTime(),
          type: 'Inflow'
        }
      ];
      const csv = generateCSV(transactions);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('""'); // Empty description wrapped in quotes
    });
  });
});
