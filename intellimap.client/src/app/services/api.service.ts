import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PreRes {
  des: string;
  prob: number;
}

export interface UpdateMapResponse {
  code: number;
  data: {
    actionList: string[];
    preRes: PreRes[];
  };
  msg?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  /**
   * 通用 POST 方法
   * @param endpoint API 路径
   * @param body 请求体
   * @returns Observable<T>
   */
  postData<T>(endpoint: string, body: any): Observable<T> {
    const url = `${environment.apiUrl}/${endpoint}`;
    return this.http.post<T>(url, body).pipe(
      catchError((error) => {
        console.error(`Error in POST ${endpoint}:`, error);
        return throwError(() => new Error('API request failed'));
      })
    );
  }

  /**
   * 调用 updateMap API 方法
   * @param userId 用户 ID
   * @param actionsTaken 行为路径数组
   * @param newDesc 可选的用户描述
   * @returns Observable<UpdateMapResponse>
   */
  postUpdateMap(
    userId: string,
    actionsTaken: string[],
    newDesc?: string
  ): Observable<UpdateMapResponse> {
    const endpoint = 'api/updateMap';
    const body = {
      userId,
      actionsTaken,
      newDesc: newDesc ?? '', // 如果 newDesc 未定义，则传递空字符串
    };
    console.log('发送的请求体:', body); // 调试输出请求体
    return this.postData<UpdateMapResponse>(endpoint, body); // 确保返回 Observable<UpdateMapResponse>
  }
}
