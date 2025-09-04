import mysql.connector
from mysql.connector import Error

class Database:
    def __init__(self, host, port=3306, user=None, password=None, database=None):
        try:
            self.connection = mysql.connector.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                autocommit=True
            )
        except Error as e:
            print(f"[DB ERROR] Failed to connect: {e}")
            self.connection = None

    def get_user_by_iin(self, iin: str):
        """Fetch user by IIN, return dict or None"""
        if not self.connection:
            raise RuntimeError("No DB connection")

        cursor = self.connection.cursor(dictionary=True)

        # Step 1: get user_id
        cursor.execute(
            "SELECT user_id FROM user_staff WHERE tabel_number = %s",
            (iin,)
        )
        row = cursor.fetchone()
        if not row:
            cursor.close()
            return None

        user_id = row["user_id"]

        # Step 2: get user info
        cursor.execute(
            "SELECT first_name, last_name, middle_name FROM user WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        cursor.close()

        if not user:
            return None

        return {"user_id": user_id, **user}
