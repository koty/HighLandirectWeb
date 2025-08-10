#!/usr/bin/env python3
"""
SQL Server Compact Edition から SQLite への移行プログラム
実行環境: Python 3.6+
必要パッケージ: pip install pyodbc sqlite3 (sqlite3は標準ライブラリ)

使用方法:
python migrate.py --sqlce-path "C:/path/to/MyData.sdf" --sqlite-path "./new_database.sqlite"
"""

import argparse
import sqlite3
import pyodbc
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

class DatabaseMigrator:
    def __init__(self, sqlce_path: str, sqlite_path: str):
        self.sqlce_path = sqlce_path
        self.sqlite_path = sqlite_path
        self.sqlce_conn = None
        self.sqlite_conn = None
        
    def connect_databases(self):
        """データベース接続を確立"""
        try:
            # SQL Server Compact Edition接続
            sqlce_conn_str = f"Provider=Microsoft.SQLSERVER.CE.OLEDB.4.0;Data Source={self.sqlce_path};"
            self.sqlce_conn = pyodbc.connect(f"DSN='';"
                                           f"DRIVER={{Microsoft SQL Server Compact Edition}};")
            print(f"SQL CE接続成功: {self.sqlce_path}")
            
        except Exception as e:
            # ODBCが使えない場合の代替接続方法
            print(f"ODBC接続失敗、代替方法を試行中: {e}")
            try:
                import adodbapi
                sqlce_conn_str = f"Provider=Microsoft.SQLSERVER.CE.OLEDB.4.0;Data Source={self.sqlce_path};"
                self.sqlce_conn = adodbapi.connect(sqlce_conn_str)
                print("ADO接続成功")
            except Exception as e2:
                print(f"ADO接続も失敗: {e2}")
                print("手動でデータをエクスポートしてください")
                return False
        
        # SQLite接続
        self.sqlite_conn = sqlite3.connect(self.sqlite_path)
        self.sqlite_conn.execute("PRAGMA foreign_keys = ON")
        print(f"SQLite接続成功: {self.sqlite_path}")
        
        return True
    
    def create_sqlite_schema(self):
        """SQLiteスキーマを作成"""
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        
        if not os.path.exists(schema_path):
            print(f"スキーマファイルが見つかりません: {schema_path}")
            return False
            
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # SQLを実行（複数のステートメントを分割）
        statements = schema_sql.split(';')
        for stmt in statements:
            stmt = stmt.strip()
            if stmt:
                try:
                    self.sqlite_conn.execute(stmt)
                except sqlite3.Error as e:
                    print(f"スキーマ作成エラー: {e}")
                    print(f"SQL: {stmt}")
        
        self.sqlite_conn.commit()
        print("SQLiteスキーマ作成完了")
        return True
    
    def migrate_customers_to_address_and_shipper_consignee(self):
        """
        CustomerMasterから Address, Shipper, Consignee への移行
        - LatestSendがあるCustomerのみShipperに移行
        - LatestResceiveがあるCustomerのみConsigneeに移行
        """
        try:
            # SQL CEから顧客データを取得
            cursor = self.sqlce_conn.cursor()
            cursor.execute("""
                SELECT CustNo, Furigana, CustName, Keisho, CityName, PostalCD, 
                       PrefectureCD, PrefectureName, RegionCD, RegionName,
                       Address1, Address2, Address3, Address4, Phone, Fax, Phone2,
                       MailAddress, Memo, Label, LatestSend, LatestResceive
                FROM CustomerMaster 
                WHERE Delete IS NULL OR Delete = 0
            """)
            
            customers = cursor.fetchall()
            print(f"取得した顧客数: {len(customers)}")
            
            address_mapping = {}  # CustNo -> AddressId のマッピング
            shipper_count = 0
            consignee_count = 0
            
            for customer in customers:
                cust_no = customer[0]
                latest_send = customer[20]  # LatestSend
                latest_receive = customer[21]  # LatestResceive
                
                # Addressテーブルに挿入（全顧客）
                address_cursor = self.sqlite_conn.cursor()
                address_cursor.execute("""
                    INSERT INTO Address (
                        Furigana, Name, Keisho, CityName, PostalCD,
                        PrefectureCD, PrefectureName, RegionCD, RegionName,
                        Address1, Address2, Address3, Address4,
                        Phone, Fax, Phone2, MailAddress, Memo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, customer[1:18])
                
                address_id = address_cursor.lastrowid
                address_mapping[cust_no] = address_id  # CustNo -> AddressId
                
                # LatestSendがある場合のみShipperテーブルに挿入
                if latest_send is not None:
                    address_cursor.execute("""
                        INSERT INTO Shipper (AddressId, ShipperCode, ShipperType)
                        VALUES (?, ?, ?)
                    """, (address_id, f"SHIP{cust_no:04d}", "既存荷主"))
                    shipper_count += 1
                
                # LatestResceiveがある場合のみConsigneeテーブルに挿入
                if latest_receive is not None:
                    address_cursor.execute("""
                        INSERT INTO Consignee (AddressId, ConsigneeCode)
                        VALUES (?, ?)
                    """, (address_id, f"CONS{cust_no:04d}"))
                    consignee_count += 1
            
            self.sqlite_conn.commit()
            print(f"住所データ移行完了: {len(customers)}件")
            print(f"荷主データ移行完了: {shipper_count}件 (LatestSendがある顧客)")
            print(f"送付先データ移行完了: {consignee_count}件 (LatestResceiveがある顧客)")
            return address_mapping
            
        except Exception as e:
            print(f"顧客データ移行エラー: {e}")
            return {}
    
    def migrate_products(self):
        """ProductMaster の移行"""
        try:
            cursor = self.sqlce_conn.cursor()
            cursor.execute("""
                SELECT ProductID, ProductName, Tanka, IsDefault
                FROM ProductMaster
            """)
            
            products = cursor.fetchall()
            print(f"移行対象商品数: {len(products)}")
            
            for product in products:
                self.sqlite_conn.execute("""
                    INSERT INTO ProductMaster (ProductCode, ProductName, UnitPrice, IsDefault)
                    VALUES (?, ?, ?, ?)
                """, (f"PROD{product[0]:04d}", product[1], product[2], product[3] or 0))
            
            self.sqlite_conn.commit()
            print("商品データ移行完了")
            
        except Exception as e:
            print(f"商品データ移行エラー: {e}")
    
    def migrate_stores(self):
        """Store の移行"""
        try:
            cursor = self.sqlce_conn.cursor()
            cursor.execute("""
                SELECT id, StoreId1, StoreId2, CustomerCD, StoreName, IsDefault
                FROM Store
            """)
            
            stores = cursor.fetchall()
            print(f"移行対象店舗数: {len(stores)}")
            
            for store in stores:
                self.sqlite_conn.execute("""
                    INSERT INTO Store (
                        StoreCode, StoreName, CarrierCode, CarrierName, IsDefault
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    store[1] or f"STORE{store[0]}",
                    store[4] or "集配所",
                    "YAMATO",
                    "ヤマト運輸",
                    store[5] or 0
                ))
            
            self.sqlite_conn.commit()
            print("店舗データ移行完了")
            
        except Exception as e:
            print(f"店舗データ移行エラー: {e}")
    
    def migrate_orders(self, address_mapping: Dict[int, int]):
        """Order と OrderHistory の移行"""
        try:
            # 現在の注文を移行
            cursor = self.sqlce_conn.cursor()
            cursor.execute("""
                SELECT OrderID, OrderDate, ReceiveCustID, SendCustID, ProductID
                FROM [Order]
            """)
            
            orders = cursor.fetchall()
            print(f"移行対象注文数: {len(orders)}")
            
            for order in orders:
                # 顧客IDをShipper/ConsigneeIDに変換
                send_address_id = address_mapping.get(order[3])
                receive_address_id = address_mapping.get(order[2])
                
                if not send_address_id or not receive_address_id:
                    print(f"顧客マッピングが見つかりません: Order {order[0]}")
                    continue
                
                # ShipperIdとConsigneeIdを取得
                shipper_cursor = self.sqlite_conn.cursor()
                shipper_cursor.execute("SELECT ShipperId FROM Shipper WHERE AddressId = ?", 
                                     (send_address_id,))
                shipper_result = shipper_cursor.fetchone()
                
                consignee_cursor = self.sqlite_conn.cursor()
                consignee_cursor.execute("SELECT ConsigneeId FROM Consignee WHERE AddressId = ?", 
                                       (receive_address_id,))
                consignee_result = consignee_cursor.fetchone()
                
                if not shipper_result or not consignee_result:
                    continue
                
                # デフォルトのStoreIdを取得
                store_cursor = self.sqlite_conn.cursor()
                store_cursor.execute("SELECT StoreId FROM Store WHERE IsDefault = 1 LIMIT 1")
                store_result = store_cursor.fetchone()
                store_id = store_result[0] if store_result else 1
                
                self.sqlite_conn.execute("""
                    INSERT INTO "Order" (
                        OrderNumber, OrderDate, ShipperId, ConsigneeId, 
                        ProductId, StoreId, OrderStatus
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"ORD{order[0]:08d}",
                    order[1],
                    shipper_result[0],
                    consignee_result[0],
                    order[4],
                    store_id,
                    "completed"
                ))
            
            # 履歴データの移行
            cursor.execute("""
                SELECT OrderID, OrderDate, ReceiveCustID, SendCustID, ProductID
                FROM OrderHistory
            """)
            
            histories = cursor.fetchall()
            print(f"移行対象履歴数: {len(histories)}")
            
            # OrderHistoryは簡素化して移行
            for history in histories:
                self.sqlite_conn.execute("""
                    INSERT INTO OrderHistory (OrderId, StatusChange, NewStatus, ChangedBy)
                    VALUES (?, ?, ?, ?)
                """, (history[0], "履歴データ移行", "completed", "migration"))
            
            self.sqlite_conn.commit()
            print("注文データ移行完了")
            
        except Exception as e:
            print(f"注文データ移行エラー: {e}")
    
    def migrate_report_memos(self):
        """ReportMemo の移行"""
        try:
            cursor = self.sqlce_conn.cursor()
            cursor.execute("""
                SELECT ReportMemoId, ReportMemo, MemoName, IsDefault
                FROM ReportMemo
            """)
            
            memos = cursor.fetchall()
            print(f"移行対象メモ数: {len(memos)}")
            
            for memo in memos:
                self.sqlite_conn.execute("""
                    INSERT INTO ReportMemo (MemoName, MemoContent, IsDefault)
                    VALUES (?, ?, ?)
                """, (memo[2], memo[1], memo[3] or 0))
            
            self.sqlite_conn.commit()
            print("レポートメモ移行完了")
            
        except Exception as e:
            print(f"レポートメモ移行エラー: {e}")
    
    def run_migration(self):
        """移行処理を実行"""
        print("=== HighLandirect データベース移行開始 ===")
        print(f"移行元: {self.sqlce_path}")
        print(f"移行先: {self.sqlite_path}")
        
        if not self.connect_databases():
            return False
        
        if not self.create_sqlite_schema():
            return False
        
        try:
            # データ移行実行
            address_mapping = self.migrate_customers_to_address_and_shipper_consignee()
            self.migrate_products()
            self.migrate_stores()
            self.migrate_orders(address_mapping)
            self.migrate_report_memos()
            
            print("=== 移行完了 ===")
            return True
            
        except Exception as e:
            print(f"移行処理エラー: {e}")
            return False
        
        finally:
            if self.sqlce_conn:
                self.sqlce_conn.close()
            if self.sqlite_conn:
                self.sqlite_conn.close()

def main():
    parser = argparse.ArgumentParser(description="SQL CE から SQLite への移行ツール")
    parser.add_argument("--sqlce-path", required=True, help="SQL CE データベースファイルパス")
    parser.add_argument("--sqlite-path", required=True, help="SQLite 出力ファイルパス")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.sqlce_path):
        print(f"SQL CEファイルが見つかりません: {args.sqlce_path}")
        sys.exit(1)
    
    # 出力ディレクトリ作成
    os.makedirs(os.path.dirname(os.path.abspath(args.sqlite_path)), exist_ok=True)
    
    migrator = DatabaseMigrator(args.sqlce_path, args.sqlite_path)
    success = migrator.run_migration()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()