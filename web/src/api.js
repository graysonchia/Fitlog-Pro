import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
});

export const fetchChurn = () =>
  fetch("http://localhost:8000/analytics/ml/churn").then((r) => r.json());

export const fetchClusters = () =>
  fetch("http://localhost:8000/analytics/ml/clusters").then((r) => r.json());

export const fetchGoalForecasts = () =>
  fetch("http://localhost:8000/analytics/ml/goal-forecasts").then((r) => r.json());
