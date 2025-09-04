import os
import re
import mysql.connector
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import base64

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# --- DB connection helper ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )


# --- Routes ---
@app.route("/")
def index():
    return render_template("index.html")


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

@app.route("/api/get_user_by_iin", methods=["POST"])
def get_user_by_iin():
    try:
        data = request.get_json()
        iin = data.get("iin")

        print(f"Received IIN: {iin}")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # First query: find user_id
        cursor.execute(
            "SELECT user_id FROM user_staff WHERE tabel_number = %s", (iin,)
        )
        row = cursor.fetchone()
        print(f"user_staff query result: {row}")

        if not row:
            print(f"No user_id found for IIN {iin}")
            return jsonify({"success": False, "error": "User not found"}), 404

        user_id = row["user_id"]

        # Second query: fetch user info
        cursor.execute(
            "SELECT first_name, last_name, middle_name FROM user WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        print(f"users query result: {user}")

        cursor.close()
        conn.close()

        if not user:
            print(f"No user record found for user_id {user_id}")
            return jsonify({"success": False, "error": "User not found"}), 404

        return jsonify({
            "success": True,
            "user_id": user_id,
            **user
        })

    except Exception as e:
        print("Error in /api/get_user_by_iin:", e)
        return jsonify({"success": False, "error": str(e)}), 500

def validate_iin(iin): # BS
    """Validate IIN (Individual Identification Number) format"""
    if not iin or len(iin) != 12:
        return False
    return iin.isdigit()

def extract_base64_image(data_url):
    """Extract base64 image data from data URL"""
    try:
        if ',' in data_url:
            return data_url.split(',')[1]
        return data_url
    except Exception:
        return None

@app.route('/api/submit-face', methods=['POST'])
def submit_face():
    try:
        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({"error": "Отсутствуют данные"}), 400
        
        # Extract fields
        iin = data.get('iin', '').strip()
        user_id = data.get('user_id')
        photo_data_url = data.get('photo', '').strip()
        
        # Basic validation
        if not iin:
            return jsonify({"error": "ИИН не указан"}), 400
        
        if not validate_iin(iin):
            return jsonify({"error": "Некорректный формат ИИН"}), 400
        
        if not user_id:
            return jsonify({"error": "Идентификатор пользователя не указан"}), 400
        
        if not photo_data_url:
            return jsonify({"error": "Фотография не предоставлена"}), 400
        
        # Validate data URL format
        if not photo_data_url.startswith('data:image/'):
            return jsonify({"error": "Некорректный формат изображения"}), 400
        
        # Extract base64 image data
        photo_base64 = extract_base64_image(photo_data_url)
        if not photo_base64:
            return jsonify({"error": "Некорректный формат изображения"}), 400
        
        # Validate base64 image data
        try:
            # Add padding if necessary and decode
            missing_padding = len(photo_base64) % 4
            if missing_padding:
                photo_base64 += '=' * (4 - missing_padding)
            decoded_image = base64.b64decode(photo_base64, validate=True)
            print(f"Successfully decoded image: {len(decoded_image)} bytes")
        except Exception as e:
            print(f"Base64 decode error: {str(e)}")
            return jsonify({"error": "Некорректные данные изображения"}), 400
        
        # Just print that we received the image
        print(f"Received image for IIN: {iin}, User ID: {user_id}")
        print(f"Image size: {len(photo_base64)} characters")
        
        return jsonify({
            "message": "Изображение получено",
            "success": True
        }), 200
        
        # Just print that we received the image
        print(f"Received image for IIN: {iin}, User ID: {user_id}")
        print(f"Image size: {len(photo_base64)} characters")
        
        return jsonify({
            "message": "Изображение получено",
            "success": True
        }), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500

def main():
    app.run(host="0.0.0.0", port=8080, debug=True)


if __name__ == "__main__":
    main()

