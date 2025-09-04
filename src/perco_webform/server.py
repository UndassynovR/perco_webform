from flask import Flask, request, jsonify, render_template, send_from_directory
import base64

import os
from .database import Database
from .perco import Perco

from dotenv import load_dotenv
load_dotenv()
perco = Perco(os.getenv("PERCO_SERVER"), os.getenv("PERCO_PORT"), os.getenv("PERCO_LOGIN"), os.getenv("PERCO_PASSWORD"))
db = Database(os.getenv("DB_HOST"), os.getenv("DB_PORT"), os.getenv("DB_USER"), os.getenv("DB_PASSWORD"), os.getenv("DB_NAME"))

app = Flask(__name__)

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

@app.route("/api/users/by_iin/<iin>", methods=["GET"])
def get_user_by_iin(iin):
    try:
        print(f"Received IIN: {iin}")
        user = db.get_user_by_iin(iin)

        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        return jsonify({"success": True, **user})

    except Exception as e:
        print("Error in GET /api/users/by_iin:", e)
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

@app.route("/api/users/<int:user_id>/face", methods=["PUT"])
def upsert_user_face(user_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Отсутствуют данные"}), 400

        # Extract fields
        iin = data.get("iin", "").strip()
        photo_data_url = data.get("photo", "").strip()

        # Basic validation
        if not iin:
            return jsonify({"error": "ИИН не указан"}), 400

        if not validate_iin(iin):
            return jsonify({"error": "Некорректный формат ИИН"}), 400

        if not photo_data_url:
            return jsonify({"error": "Фотография не предоставлена"}), 400

        if not photo_data_url.startswith("data:image/"):
            return jsonify({"error": "Некорректный формат изображения"}), 400

        # Extract base64 image data
        photo_base64 = extract_base64_image(photo_data_url)
        if not photo_base64:
            return jsonify({"error": "Некорректный формат изображения"}), 400

        # Decode base64 safely
        try:
            missing_padding = len(photo_base64) % 4
            if missing_padding:
                photo_base64 += "=" * (4 - missing_padding)
            decoded_image = base64.b64decode(photo_base64, validate=True)
            print(f"Successfully decoded image: {len(decoded_image)} bytes")
        except Exception as e:
            print(f"Base64 decode error: {str(e)}")
            return jsonify({"error": "Некорректные данные изображения"}), 400

        perco_result = perco.update_bio(user_id, photo_base64)
        if not perco_result:
            return jsonify({"error": "Не удалось обновить биометрию"}), 500

        return jsonify({
            "message": "Фотография обновлена",
            "success": True,
            "db_response": perco_result
        }), 200

    except Exception as e:
        print(f"Error in PUT /api/users/{user_id}/face: {str(e)}")
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500
