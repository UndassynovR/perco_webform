import json
import requests
import http.client
import base64

class Perco:
    def __init__(self, server, port, login, password):
        self.server = server
        self.port = port
        self.login = login
        self.password = password
        self.conn = http.client.HTTPConnection(server, port)
        self.token = self._get_token()

    def _get_token(self):
        payload = json.dumps({
            "login": self.login,
            "password": self.password
        })
        headers = {"Content-Type": "application/json"}
        self.conn.request("POST", "/api/system/auth", payload, headers)
        res = self.conn.getresponse()
        data = res.read()
        return json.loads(data.decode("utf-8"))["token"]

    def _headers(self):
        return {
            "Content-Type": "application/json; charset=UTF-8",
            "Authorization": f"Bearer {self.token}"
        }

    def get_devices(self):
        url = f"http://{self.server}:{self.port}/api/devices"
        response = requests.get(url, headers=self._headers())
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=4, ensure_ascii=False))
            return response.json()
        else:
            print(f"Ошибка {response.status_code}: {response.text}")
            return None

    def _get_template(self, photo, device_id=30):
        """Private: Generate face template from photo"""
        url = f"http://{self.server}:{self.port}/api/users/bio/getFaceTemplate"
        body = {"photo": photo}
        querystring = {"deviceId": device_id}

        print("Request body:", json.dumps(body)[:200], "...")
        print("Query:", querystring)
        print("Headers:", self._headers())

        response = requests.post(url, headers=self._headers(), json=body, params=querystring)
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=4, ensure_ascii=False))
            return response.json()
        else:
            print(f"Ошибка {response.status_code}: {response.text}")
            return None

    def get_bio(self, user_id):
        url = f"http://{self.server}:{self.port}/api/users/bio/{user_id}"
        response = requests.get(url, headers=self._headers())
        try:
            return response.json()
        except json.JSONDecodeError:
            print("Ошибка декодирования JSON")
            print(response.text)
            return None

    def update_bio(self, user_id, photo):
        """Generate template from photo and update user bio"""
        # template_response = self._get_template(photo)
        # if not template_response or "template" not in template_response:
        #     print(f"Некорректный ответ при получении шаблона для пользователя {user_id}: {template_response}")
        #     return None

        # print(template_response)
        template = 'data:image/jpeg;base64,{}'.format(photo)#template_response.get("template"))
        if not template:
            print(f"В ответе нет шаблона для пользователя {user_id}")
            return None

        url = f"http://{self.server}:{self.port}/api/users/bio/{user_id}"
        querystring = {"type": 2}
        body = {
            "name": "Лицо #1",
            "templateType": 3,
            "number": 0,
            "template": template
        }
        response = requests.put(url, headers=self._headers(), json=body, params=querystring)
        if response.status_code != 200:
            print(f"Ошибка {response.status_code}: {response.text}, user_id={user_id}")
            return None

        return response.json()

def get_base64(image_path):
    with open(image_path, "rb") as image_file:
        # Read the image file as a binary
        image_binary = image_file.read()

        # Convert the binary data to a base64 encoded string
        base64_encoded = base64.b64encode(image_binary).decode("utf-8")

        return base64_encoded
