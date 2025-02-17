import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEventType,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private uploadUrl = '';

  constructor(private http: HttpClient) {}

  uploadFiles(files: File[]): Observable<number | any> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));

    return this.http
      .post(this.uploadUrl, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event) => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              if (event.total) {
                return Math.round((100 * event.loaded) / event.total);
              }
              return 0;
            case HttpEventType.Response:
              return event.body;
            default:
              return 0;
          }
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = `Server-side error: ${error.status} - ${error.message}`;
    }
    return throwError(() => {
      new Error(errorMessage);
    });
  }
}
