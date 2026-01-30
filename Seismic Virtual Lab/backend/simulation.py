import numpy as np

def simulate_building(m, k, c, floors, T=10, dt=0.01):

    # ============================
    # TIME
    # ============================
    t = np.arange(0, T, dt)
    steps = len(t)

    # ============================
    # RESPONSE ARRAYS
    # ============================
    x = np.zeros((floors, steps))
    v = np.zeros((floors, steps))
    a = np.zeros((floors, steps))

    # ============================
    # EARTHQUAKE INPUT (Ground motion)
    # depends on m, k, c
    # ============================
    ag = 0.3 * np.sin(2 * np.pi * t * (k/(m+1)) * 0.001) * np.exp(-c * t * 0.001)

    # ============================
    # TIME INTEGRATION
    # ============================
    for i in range(1, steps):
        for f in range(floors):

            if f == 0:
                restoring = -k * x[f][i-1]
            else:
                restoring = -k * (x[f][i-1] - x[f-1][i-1])

            damping = -c * v[f][i-1]
            inertia = -m * ag[i]

            a[f][i] = (restoring + damping + inertia) / m

            v[f][i] = v[f][i-1] + a[f][i] * dt
            x[f][i] = x[f][i-1] + v[f][i] * dt

    # ============================
    # DRIFT CALCULATION
    # ============================
    drift = []
    max_drift = 0

    for f in range(floors - 1):
        floor_drift = (x[f+1] - x[f]) / 3.0   # storey height = 3m
        drift.append(floor_drift.tolist())

        local_max = np.max(np.abs(floor_drift))
        if local_max > max_drift:
            max_drift = local_max

    # ============================
    # SAFETY STATUS
    # ============================
    if max_drift > 0.02:
        status = "UNSAFE"
    else:
        status = "SAFE"

    # ============================
    # MODE SHAPES & FREQUENCIES
    # ============================
    M = m * np.eye(floors)

    K = np.zeros((floors, floors))
    for i in range(floors):
        if i == 0:
            K[i,i] = k
            if floors > 1:
                K[i,i+1] = -k
        elif i == floors-1:
            K[i,i] = k
            K[i,i-1] = -k
        else:
            K[i,i] = 2*k
            K[i,i-1] = -k
            K[i,i+1] = -k

    eigvals, eigvecs = np.linalg.eig(np.linalg.inv(M).dot(K))

    frequencies = (np.sqrt(np.abs(eigvals)) / (2*np.pi)).tolist()
    mode_shapes = eigvecs.tolist()

    # ============================
    # SPECTRAL RESPONSE (PHASE 2)
    # ============================
    spectral_displacement = []
    spectral_velocity = []
    spectral_acceleration = []

    for f in range(floors):
        sd = np.max(np.abs(x[f]))
        sv = np.max(np.abs(v[f]))
        sa = np.max(np.abs(a[f]))

        spectral_displacement.append(float(sd))
        spectral_velocity.append(float(sv))
        spectral_acceleration.append(float(sa))

    # ============================
    # RETURN JSON SAFE DATA
    # ============================
    return {
        "time": t.tolist(),
        "displacement": x.tolist(),
        "drift": drift,
        "max_drift": round(float(max_drift), 5),
        "status": status,
        "frequencies": frequencies,
        "mode_shapes": mode_shapes,
        "ground_motion": ag.tolist(),   # Earthquake input graph
        "spectral_displacement": spectral_displacement,
        "spectral_velocity": spectral_velocity,
        "spectral_acceleration": spectral_acceleration
    }
