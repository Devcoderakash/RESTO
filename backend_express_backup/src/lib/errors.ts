export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function databaseError(error: { message?: string; code?: string }, fallback = "Database request failed"): AppError {
  if (error.code === "23505") return new AppError(409, "A record with these details already exists", "CONFLICT");
  if (error.code === "P0001") return new AppError(409, error.message ?? "The requested operation is not allowed", "CONFLICT");
  if (error.code === "PGRST116") return new AppError(404, "Record not found", "NOT_FOUND");
  return new AppError(500, fallback, "DATABASE_ERROR");
}
