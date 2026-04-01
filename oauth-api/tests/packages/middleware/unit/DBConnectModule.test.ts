/**
 * Unit tests for the DBConnectModule
 *
 * @since setup-tests--JP
 */
import { connectDatabase, disconnectDatabase } from '@reporter/middleware';
import { DatabaseConnectionError } from '@reporter/common';

describe('DBConnectModule', () => {
  it('should throw an database connection error if the database url is not set', async () => {
    delete process.env.DATABASE_URL;
    await expect(connectDatabase()).rejects.toThrow(DatabaseConnectionError);
  });

  it('should throw an database connection error if the connection to the database fails', async () => {
    process.env.DATABASE_URL = 'postgresql://test_user:test_password@cl-reporter-db-srv:5432/cl_reporter';
    await expect(connectDatabase()).rejects.toThrow(DatabaseConnectionError);
  });
});