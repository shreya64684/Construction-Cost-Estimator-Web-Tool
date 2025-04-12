import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os

# Sample data (replace this with your actual dataset)
np.random.seed(42)
n_samples = 1000

data = {
    'temperature': np.random.uniform(20, 40, n_samples),
    'humidity': np.random.uniform(30, 90, n_samples),
    'vibration_level': np.random.uniform(0, 10, n_samples),
    'material_usage': np.random.uniform(60, 100, n_samples),
    'worker_count': np.random.randint(5, 50, n_samples),
    'energy_consumption': np.random.uniform(1000, 5000, n_samples),
    'cost_deviation': np.random.uniform(-20, 30, n_samples),
    'time_deviation': np.random.uniform(-10, 30, n_samples),
    'safety_incidents': np.random.randint(0, 5, n_samples),
    'equipment_utilization_rate': np.random.uniform(50, 100, n_samples),
    'material_shortage_alert': np.random.randint(0, 2, n_samples)
}

# Calculate risk (example formula)
risk = (
    0.1 * (data['temperature'] - 20) / 20 +
    0.1 * (data['humidity'] - 30) / 60 +
    0.1 * data['vibration_level'] / 10 +
    0.1 * (100 - data['material_usage']) / 40 +
    0.1 * data['cost_deviation'] / 50 +
    0.1 * data['time_deviation'] / 40 +
    0.2 * data['safety_incidents'] / 5 +
    0.1 * (100 - data['equipment_utilization_rate']) / 50 +
    0.1 * data['material_shortage_alert']
)

# Normalize risk between 0 and 1
risk = (risk - risk.min()) / (risk.max() - risk.min())

# Create DataFrame
df = pd.DataFrame(data)
X = df
y = risk

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Model Evaluation
y_pred = model.predict(X_test)

# Calculate metrics
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

# Feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nModel Performance Metrics:")
print(f"R² Score: {r2:.4f}")
print(f"Mean Squared Error: {mse:.4f}")
print(f"Root Mean Squared Error: {rmse:.4f}")
print(f"Mean Absolute Error: {mae:.4f}")

print("\nFeature Importance:")
print(feature_importance)

# Save the model
model_dir = os.path.join(os.path.dirname(__file__), 'model')
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, 'construction_risk_predictor.pkl')
joblib.dump(model, model_path)
print(f"\nModel saved to {model_path}")