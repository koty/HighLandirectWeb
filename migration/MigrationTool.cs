using System;
using System.Data;
using System.Data.SqlServerCe;
using System.Data.SQLite;
using System.IO;
using System.Collections.Generic;

namespace HighLandirectMigration
{
    /// <summary>
    /// SQL Server Compact Edition から SQLite への移行ツール (C#版)
    /// 
    /// 使用方法:
    /// MigrationTool.exe "C:\path\to\MyData.sdf" "C:\path\to\new_database.sqlite"
    /// 
    /// 必要な参照:
    /// - System.Data.SqlServerCe.dll
    /// - System.Data.SQLite.dll
    /// </summary>
    public class MigrationTool
    {
        private string _sqlCePath;
        private string _sqlitePath;
        private SqlCeConnection _sqlCeConnection;
        private SQLiteConnection _sqliteConnection;
        private Dictionary<int, long> _addressMapping;

        public MigrationTool(string sqlCePath, string sqlitePath)
        {
            _sqlCePath = sqlCePath;
            _sqlitePath = sqlitePath;
            _addressMapping = new Dictionary<int, long>();
        }

        public bool RunMigration()
        {
            Console.WriteLine("=== HighLandirect データベース移行開始 ===");
            Console.WriteLine($"移行元: {_sqlCePath}");
            Console.WriteLine($"移行先: {_sqlitePath}");

            try
            {
                if (!ConnectDatabases()) return false;
                if (!CreateSQLiteSchema()) return false;

                MigrateCustomersToAddressAndRoles();
                MigrateProducts();
                MigrateStores();
                MigrateOrders();
                MigrateReportMemos();

                Console.WriteLine("=== 移行完了 ===");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"移行エラー: {ex.Message}");
                return false;
            }
            finally
            {
                _sqlCeConnection?.Close();
                _sqliteConnection?.Close();
            }
        }

        private bool ConnectDatabases()
        {
            try
            {
                // SQL Server Compact Edition 接続
                string sqlCeConnectionString = $"Data Source={_sqlCePath}";
                _sqlCeConnection = new SqlCeConnection(sqlCeConnectionString);
                _sqlCeConnection.Open();
                Console.WriteLine("SQL CE接続成功");

                // SQLite 接続
                string sqliteConnectionString = $"Data Source={_sqlitePath};Version=3;";
                _sqliteConnection = new SQLiteConnection(sqliteConnectionString);
                _sqliteConnection.Open();

                // 外部キー制約を有効化
                using (var cmd = new SQLiteCommand("PRAGMA foreign_keys = ON", _sqliteConnection))
                {
                    cmd.ExecuteNonQuery();
                }
                
                Console.WriteLine("SQLite接続成功");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"データベース接続エラー: {ex.Message}");
                return false;
            }
        }

        private bool CreateSQLiteSchema()
        {
            try
            {
                string schemaPath = Path.Combine(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location), "schema.sql");
                
                if (!File.Exists(schemaPath))
                {
                    Console.WriteLine($"スキーマファイルが見つかりません: {schemaPath}");
                    return false;
                }

                string schemaSql = File.ReadAllText(schemaPath);
                string[] statements = schemaSql.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);

                foreach (string statement in statements)
                {
                    string stmt = statement.Trim();
                    if (!string.IsNullOrEmpty(stmt))
                    {
                        try
                        {
                            using (var cmd = new SQLiteCommand(stmt, _sqliteConnection))
                            {
                                cmd.ExecuteNonQuery();
                            }
                        }
                        catch (SQLiteException ex)
                        {
                            Console.WriteLine($"スキーマ作成エラー: {ex.Message}");
                            Console.WriteLine($"SQL: {stmt}");
                        }
                    }
                }

                Console.WriteLine("SQLiteスキーマ作成完了");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"スキーマ作成エラー: {ex.Message}");
                return false;
            }
        }

        private void MigrateCustomersToAddressAndRoles()
        {
            Console.WriteLine("顧客データ移行開始...");
            
            string selectSql = @"
                SELECT CustNo, Furigana, CustName, Keisho, CityName, PostalCD, 
                       PrefectureCD, PrefectureName, RegionCD, RegionName,
                       Address1, Address2, Address3, Address4, Phone, Fax, Phone2,
                       MailAddress, Memo, Label, LatestSend, LatestResceive
                FROM CustomerMaster 
                WHERE [Delete] IS NULL OR [Delete] = 0";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int addressCount = 0;
                int shipperCount = 0;
                int consigneeCount = 0;
                
                while (reader.Read())
                {
                    int custNo = reader.GetInt32("CustNo");
                    DateTime? latestSend = GetSafeDateTime(reader, "LatestSend");
                    DateTime? latestReceive = GetSafeDateTime(reader, "LatestResceive");

                    // Address テーブルに挿入（全顧客）
                    string addressInsertSql = @"
                        INSERT INTO Address (
                            Furigana, Name, Keisho, CityName, PostalCD,
                            PrefectureCD, PrefectureName, RegionCD, RegionName,
                            Address1, Address2, Address3, Address4,
                            Phone, Fax, Phone2, MailAddress, Memo
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                    using (var addressCmd = new SQLiteCommand(addressInsertSql, _sqliteConnection))
                    {
                        addressCmd.Parameters.AddWithValue("@p1", GetSafeString(reader, "Furigana"));
                        addressCmd.Parameters.AddWithValue("@p2", GetSafeString(reader, "CustName"));
                        addressCmd.Parameters.AddWithValue("@p3", GetSafeString(reader, "Keisho"));
                        addressCmd.Parameters.AddWithValue("@p4", GetSafeString(reader, "CityName"));
                        addressCmd.Parameters.AddWithValue("@p5", GetSafeString(reader, "PostalCD"));
                        addressCmd.Parameters.AddWithValue("@p6", GetSafeString(reader, "PrefectureCD"));
                        addressCmd.Parameters.AddWithValue("@p7", GetSafeString(reader, "PrefectureName"));
                        addressCmd.Parameters.AddWithValue("@p8", GetSafeString(reader, "RegionCD"));
                        addressCmd.Parameters.AddWithValue("@p9", GetSafeString(reader, "RegionName"));
                        addressCmd.Parameters.AddWithValue("@p10", GetSafeString(reader, "Address1"));
                        addressCmd.Parameters.AddWithValue("@p11", GetSafeString(reader, "Address2"));
                        addressCmd.Parameters.AddWithValue("@p12", GetSafeString(reader, "Address3"));
                        addressCmd.Parameters.AddWithValue("@p13", GetSafeString(reader, "Address4"));
                        addressCmd.Parameters.AddWithValue("@p14", GetSafeString(reader, "Phone"));
                        addressCmd.Parameters.AddWithValue("@p15", GetSafeString(reader, "Fax"));
                        addressCmd.Parameters.AddWithValue("@p16", GetSafeString(reader, "Phone2"));
                        addressCmd.Parameters.AddWithValue("@p17", GetSafeString(reader, "MailAddress"));
                        addressCmd.Parameters.AddWithValue("@p18", GetSafeString(reader, "Memo"));

                        addressCmd.ExecuteNonQuery();
                    }

                    // 最後に挿入されたAddressIdを取得
                    long addressId;
                    using (var lastIdCmd = new SQLiteCommand("SELECT last_insert_rowid()", _sqliteConnection))
                    {
                        addressId = (long)lastIdCmd.ExecuteScalar();
                    }

                    _addressMapping[custNo] = addressId;
                    addressCount++;

                    // LatestSendがある場合のみShipperテーブルに挿入
                    if (latestSend.HasValue)
                    {
                        string shipperInsertSql = @"
                            INSERT INTO Shipper (AddressId, ShipperCode, ShipperType)
                            VALUES (?, ?, ?)";

                        using (var shipperCmd = new SQLiteCommand(shipperInsertSql, _sqliteConnection))
                        {
                            shipperCmd.Parameters.AddWithValue("@p1", addressId);
                            shipperCmd.Parameters.AddWithValue("@p2", $"SHIP{custNo:D4}");
                            shipperCmd.Parameters.AddWithValue("@p3", "既存荷主");
                            shipperCmd.ExecuteNonQuery();
                        }
                        shipperCount++;
                    }

                    // LatestResceiveがある場合のみConsigneeテーブルに挿入
                    if (latestReceive.HasValue)
                    {
                        string consigneeInsertSql = @"
                            INSERT INTO Consignee (AddressId, ConsigneeCode)
                            VALUES (?, ?)";

                        using (var consigneeCmd = new SQLiteCommand(consigneeInsertSql, _sqliteConnection))
                        {
                            consigneeCmd.Parameters.AddWithValue("@p1", addressId);
                            consigneeCmd.Parameters.AddWithValue("@p2", $"CONS{custNo:D4}");
                            consigneeCmd.ExecuteNonQuery();
                        }
                        consigneeCount++;
                    }
                }

                Console.WriteLine($"住所データ移行完了: {addressCount}件");
                Console.WriteLine($"荷主データ移行完了: {shipperCount}件 (LatestSendがある顧客)");
                Console.WriteLine($"送付先データ移行完了: {consigneeCount}件 (LatestResceiveがある顧客)");
            }
        }

        private void MigrateProducts()
        {
            Console.WriteLine("商品データ移行開始...");

            string selectSql = "SELECT ProductID, ProductName, Tanka, IsDefault FROM ProductMaster";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int count = 0;
                while (reader.Read())
                {
                    string insertSql = @"
                        INSERT INTO ProductMaster (ProductCode, ProductName, UnitPrice, IsDefault)
                        VALUES (?, ?, ?, ?)";

                    using (var insertCmd = new SQLiteCommand(insertSql, _sqliteConnection))
                    {
                        int productId = reader.GetInt32("ProductID");
                        insertCmd.Parameters.AddWithValue("@p1", $"PROD{productId:D4}");
                        insertCmd.Parameters.AddWithValue("@p2", GetSafeString(reader, "ProductName"));
                        insertCmd.Parameters.AddWithValue("@p3", GetSafeDecimal(reader, "Tanka"));
                        insertCmd.Parameters.AddWithValue("@p4", GetSafeBool(reader, "IsDefault") ? 1 : 0);
                        insertCmd.ExecuteNonQuery();
                    }
                    count++;
                }

                Console.WriteLine($"商品データ移行完了: {count}件");
            }
        }

        private void MigrateStores()
        {
            Console.WriteLine("店舗データ移行開始...");

            string selectSql = "SELECT id, StoreId1, StoreId2, CustomerCD, StoreName, IsDefault FROM Store";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int count = 0;
                while (reader.Read())
                {
                    string insertSql = @"
                        INSERT INTO Store (StoreCode, StoreName, CarrierCode, CarrierName, IsDefault)
                        VALUES (?, ?, ?, ?, ?)";

                    using (var insertCmd = new SQLiteCommand(insertSql, _sqliteConnection))
                    {
                        decimal storeId = reader.GetDecimal("id");
                        string storeId1 = GetSafeString(reader, "StoreId1");
                        
                        insertCmd.Parameters.AddWithValue("@p1", !string.IsNullOrEmpty(storeId1) ? storeId1 : $"STORE{storeId}");
                        insertCmd.Parameters.AddWithValue("@p2", GetSafeString(reader, "StoreName") ?? "集配所");
                        insertCmd.Parameters.AddWithValue("@p3", "YAMATO");
                        insertCmd.Parameters.AddWithValue("@p4", "ヤマト運輸");
                        insertCmd.Parameters.AddWithValue("@p5", GetSafeBool(reader, "IsDefault") ? 1 : 0);
                        insertCmd.ExecuteNonQuery();
                    }
                    count++;
                }

                Console.WriteLine($"店舗データ移行完了: {count}件");
            }
        }

        private void MigrateOrders()
        {
            Console.WriteLine("注文データ移行開始...");

            // 現在の注文を移行
            string selectSql = "SELECT OrderID, OrderDate, ReceiveCustID, SendCustID, ProductID FROM [Order]";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int count = 0;
                while (reader.Read())
                {
                    long orderId = reader.GetInt64("OrderID");
                    int receiveCustId = reader.GetInt32("ReceiveCustID");
                    int sendCustId = reader.GetInt32("SendCustID");
                    int productId = reader.GetInt32("ProductID");

                    // AddressId を取得
                    if (!_addressMapping.ContainsKey(sendCustId) || !_addressMapping.ContainsKey(receiveCustId))
                    {
                        Console.WriteLine($"顧客マッピングが見つかりません: Order {orderId}");
                        continue;
                    }

                    long sendAddressId = _addressMapping[sendCustId];
                    long receiveAddressId = _addressMapping[receiveCustId];

                    // ShipperId と ConsigneeId を取得
                    long? shipperId = GetIdByAddressId("Shipper", "ShipperId", sendAddressId);
                    long? consigneeId = GetIdByAddressId("Consignee", "ConsigneeId", receiveAddressId);

                    if (!shipperId.HasValue || !consigneeId.HasValue)
                    {
                        Console.WriteLine($"Shipper/Consignee IDが見つかりません: Order {orderId}");
                        continue;
                    }

                    // デフォルトの StoreId を取得
                    long storeId = GetDefaultStoreId();

                    string insertSql = @"
                        INSERT INTO [Order] (
                            OrderNumber, OrderDate, ShipperId, ConsigneeId, 
                            ProductId, StoreId, OrderStatus
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)";

                    using (var insertCmd = new SQLiteCommand(insertSql, _sqliteConnection))
                    {
                        insertCmd.Parameters.AddWithValue("@p1", $"ORD{orderId:D8}");
                        insertCmd.Parameters.AddWithValue("@p2", reader.GetDateTime("OrderDate"));
                        insertCmd.Parameters.AddWithValue("@p3", shipperId.Value);
                        insertCmd.Parameters.AddWithValue("@p4", consigneeId.Value);
                        insertCmd.Parameters.AddWithValue("@p5", productId);
                        insertCmd.Parameters.AddWithValue("@p6", storeId);
                        insertCmd.Parameters.AddWithValue("@p7", "completed");
                        insertCmd.ExecuteNonQuery();
                    }
                    count++;
                }

                Console.WriteLine($"注文データ移行完了: {count}件");
            }

            // OrderHistory は簡素化して移行
            MigrateOrderHistory();
        }

        private void MigrateOrderHistory()
        {
            Console.WriteLine("注文履歴移行開始...");

            string selectSql = "SELECT OrderID FROM OrderHistory";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int count = 0;
                while (reader.Read())
                {
                    long orderId = reader.GetInt64("OrderID");

                    string insertSql = @"
                        INSERT INTO OrderHistory (OrderId, StatusChange, NewStatus, ChangedBy)
                        VALUES (?, ?, ?, ?)";

                    using (var insertCmd = new SQLiteCommand(insertSql, _sqliteConnection))
                    {
                        insertCmd.Parameters.AddWithValue("@p1", orderId);
                        insertCmd.Parameters.AddWithValue("@p2", "履歴データ移行");
                        insertCmd.Parameters.AddWithValue("@p3", "completed");
                        insertCmd.Parameters.AddWithValue("@p4", "migration");
                        insertCmd.ExecuteNonQuery();
                    }
                    count++;
                }

                Console.WriteLine($"注文履歴移行完了: {count}件");
            }
        }

        private void MigrateReportMemos()
        {
            Console.WriteLine("レポートメモ移行開始...");

            string selectSql = "SELECT ReportMemoId, ReportMemo, MemoName, IsDefault FROM ReportMemo";

            using (var cmd = new SqlCeCommand(selectSql, _sqlCeConnection))
            using (var reader = cmd.ExecuteReader())
            {
                int count = 0;
                while (reader.Read())
                {
                    string insertSql = @"
                        INSERT INTO ReportMemo (MemoName, MemoContent, IsDefault)
                        VALUES (?, ?, ?)";

                    using (var insertCmd = new SQLiteCommand(insertSql, _sqliteConnection))
                    {
                        insertCmd.Parameters.AddWithValue("@p1", GetSafeString(reader, "MemoName"));
                        insertCmd.Parameters.AddWithValue("@p2", GetSafeString(reader, "ReportMemo"));
                        insertCmd.Parameters.AddWithValue("@p3", GetSafeBool(reader, "IsDefault") ? 1 : 0);
                        insertCmd.ExecuteNonQuery();
                    }
                    count++;
                }

                Console.WriteLine($"レポートメモ移行完了: {count}件");
            }
        }

        #region Helper Methods

        private string GetSafeString(IDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        private decimal GetSafeDecimal(IDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? 0m : reader.GetDecimal(ordinal);
        }

        private bool GetSafeBool(IDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return !reader.IsDBNull(ordinal) && reader.GetBoolean(ordinal);
        }

        private DateTime? GetSafeDateTime(IDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? (DateTime?)null : reader.GetDateTime(ordinal);
        }

        private long? GetIdByAddressId(string tableName, string idColumn, long addressId)
        {
            string sql = $"SELECT {idColumn} FROM {tableName} WHERE AddressId = ?";
            
            using (var cmd = new SQLiteCommand(sql, _sqliteConnection))
            {
                cmd.Parameters.AddWithValue("@p1", addressId);
                var result = cmd.ExecuteScalar();
                return result != null ? (long)result : (long?)null;
            }
        }

        private long GetDefaultStoreId()
        {
            string sql = "SELECT StoreId FROM Store WHERE IsDefault = 1 LIMIT 1";
            
            using (var cmd = new SQLiteCommand(sql, _sqliteConnection))
            {
                var result = cmd.ExecuteScalar();
                return result != null ? (long)result : 1L;
            }
        }

        #endregion

        static void Main(string[] args)
        {
            if (args.Length != 2)
            {
                Console.WriteLine("使用方法: MigrationTool.exe <SQL_CE_Path> <SQLite_Path>");
                Console.WriteLine("例: MigrationTool.exe \"C:\\MyData.sdf\" \"C:\\new_database.sqlite\"");
                return;
            }

            string sqlCePath = args[0];
            string sqlitePath = args[1];

            if (!File.Exists(sqlCePath))
            {
                Console.WriteLine($"SQL CEファイルが見つかりません: {sqlCePath}");
                return;
            }

            // 出力ディレクトリ作成
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(sqlitePath)));

            var migrator = new MigrationTool(sqlCePath, sqlitePath);
            bool success = migrator.RunMigration();

            Environment.Exit(success ? 0 : 1);
        }
    }
}