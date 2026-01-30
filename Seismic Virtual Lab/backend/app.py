from flask import Flask, request, jsonify
from flask_cors import CORS
from simulation import simulate_building

app = Flask(__name__)
CORS(app)

@app.route("/simulate", methods=["POST"])
def simulate():

    data = request.json

    m = float(data["mass"])
    k = float(data["stiffness"])
    c = float(data["damping"])
    floors = int(data["floors"])

    # ✅ backend safety limit
    if floors > 15:
        floors = 15

    result = simulate_building(m, k, c, floors)
    return jsonify(result)   # ✅ yahin function end hota hai


if __name__ == "__main__":
    app.run(debug=True)
