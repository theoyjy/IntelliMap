import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // 定义 postData 方法
  postData(endpoint: string, body: any): Observable<any> {
    const url = `${environment.apiUrl}/${endpoint}`; // 使用环境变量中的后端地址
    return this.http.post<any>(url, body); // 发送 POST 请求
  }
}
