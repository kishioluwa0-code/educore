export type ServerStudent = {
  id: string;
  schoolId: string;
  admissionNo: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  classId: string | null;
  armId: string | null;
  session: string | null;
  status: "pending" | "approved" | "rejected" | "transferred" | "withdrawn";
  admittedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServerStudentDocument = {
  id: string;
  studentId: string;
  schoolId: string;
  documentType: string;
  requirementKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  uploadedAt: string;
  verifiedAt: string | null;
};

export type StudentCreateRequest = {
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  classId?: string;
  armId?: string;
  session?: string;
};

export class StudentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StudentApiError";
  }
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new StudentApiError(message || fallback, response.status);
  } catch (error) {
    if (error instanceof StudentApiError) throw error;
    throw new StudentApiError(fallback, response.status);
  }
}

function jsonHeaders() {
  return { accept: "application/json", "content-type": "application/json" };
}

export async function listServerStudents(signal?: AbortSignal): Promise<ServerStudent[]> {
  const response = await fetch("/api/students", {
    credentials: "include",
    headers: jsonHeaders(),
    signal,
  });
  return parseResponse(response, "Unable to load students");
}

export async function getServerStudent(
  studentId: string,
  signal?: AbortSignal,
): Promise<ServerStudent> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
    credentials: "include",
    headers: jsonHeaders(),
    signal,
  });
  return parseResponse(response, "Unable to load the student");
}

export async function createServerStudent(input: StudentCreateRequest): Promise<ServerStudent> {
  const response = await fetch("/api/students", {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return parseResponse(response, "Unable to create the student");
}

export async function updateServerStudent(
  studentId: string,
  input: Partial<Omit<StudentCreateRequest, "admissionNo">>,
): Promise<ServerStudent> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return parseResponse(response, "Unable to update the student");
}

export async function approveServerStudent(studentId: string): Promise<ServerStudent> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/approve`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  return parseResponse(response, "Unable to approve the student");
}

export async function transferServerStudent(
  studentId: string,
  input: { classId: string; armId: string; effectiveDate: string; reason: string },
): Promise<ServerStudent> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/transfer`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return parseResponse(response, "Unable to transfer the student");
}

export async function withdrawServerStudent(
  studentId: string,
  input: { effectiveDate: string; reason: string },
): Promise<ServerStudent> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/withdraw`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return parseResponse(response, "Unable to withdraw the student");
}

export async function listServerStudentDocuments(
  studentId: string,
  signal?: AbortSignal,
): Promise<ServerStudentDocument[]> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/documents`, {
    credentials: "include",
    headers: jsonHeaders(),
    signal,
  });
  return parseResponse(response, "Unable to load student documents");
}

export async function uploadServerStudentDocument(
  studentId: string,
  file: File,
  documentType: string,
  requirementKey: string,
): Promise<ServerStudentDocument> {
  const response = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/documents/upload?documentType=${encodeURIComponent(documentType)}&requirementKey=${encodeURIComponent(requirementKey)}`,
    {
      method: "POST",
      credentials: "include",
      body: (() => {
        const form = new FormData();
        form.append("file", file, file.name);
        return form;
      })(),
    },
  );
  return parseResponse(response, "Unable to upload the document");
}

export async function replaceServerStudentDocument(
  studentId: string,
  documentId: string,
  file: File,
): Promise<ServerStudentDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      credentials: "include",
      body: form,
    },
  );
  return parseResponse(response, "Unable to replace the document");
}

export async function verifyServerStudentDocument(
  studentId: string,
  documentId: string,
): Promise<ServerStudentDocument> {
  const response = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(documentId)}/verify`,
    {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders(),
    },
  );
  return parseResponse(response, "Unable to verify the document");
}

export async function rejectServerStudentDocument(
  studentId: string,
  documentId: string,
  reason: string,
): Promise<ServerStudentDocument> {
  const response = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(documentId)}/reject`,
    {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders(),
      body: JSON.stringify({ reason }),
    },
  );
  return parseResponse(response, "Unable to reject the document");
}

export async function deleteServerStudentDocument(
  studentId: string,
  documentId: string,
): Promise<void> {
  const response = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: jsonHeaders(),
    },
  );
  if (!response.ok) await parseResponse(response, "Unable to delete the document");
}

export function getServerStudentDocumentDownloadUrl(studentId: string, documentId: string) {
  return `/api/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(documentId)}/download`;
}
