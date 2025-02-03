import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';


export interface Node {
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface Link {
  source: number;
  target: number;
}

interface PreRes {
  des: string;
  prob: number;
}

interface UpdateMapResponse {
  code: number;
  data: {
    actionList: string[];
    preRes: PreRes[];
  };
  msg?: string;
}

@Component({
  selector: 'app-behavior-path',
  templateUrl: './behavior-path.component.html',
  styleUrls: ['./behavior-path.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})


export class BehaviorPathComponent implements OnInit {
  private svg: any;
  private width = 1200;
  private height = 800;
  private nodes: Node[] = [];
  private links: Link[] = [];
  public recommendedActions: string[] = [];
  public showRecommendations = false;
  public newDesc = ''; // 统一使用 newDesc 表示补充信息
  public aiResult: any;
  public messages: string[] = []; // 消息列表

  constructor(private apiService: ApiService) {}

  
  ngOnInit(): void {
    this.createSvg();

    const storedResult = localStorage.getItem('aiResult');
    if (storedResult) {
      this.aiResult = JSON.parse(storedResult);
      console.log('AI 结果解析成功:', this.aiResult);
      localStorage.removeItem('aiResult');
      this.processAiResult(this.aiResult);
    } else {
      console.error('AI 结果未找到，请确保问卷页面已正确存储数据！');
    }

    window.addEventListener('resize', () => this.adjustCanvasSize());
  }

  private createSvg(): void {
    this.svg = d3
      .select('#behaviorPathContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background-color', '#f9f9f9')
      .style('border', '1px solid #ddd');
  }

  private processAiResult(aiResult: any): void {
    const actionList = aiResult.actionList || ['Default Action'];
    const preRes = aiResult.preRes?.[0] || { des: 'Unknown Result', prob: 0 };

    this.nodes = [
      { id: 1, name: actionList[0], x: 100, y: this.height / 2 },
      { id: 2, name: `${preRes.des} (${preRes.prob}%)`, x: this.width - 100, y: this.height / 2 },
    ];

    this.links = [{ source: 1, target: 2 }];
    this.updateGraph();
  }

  private adjustCanvasSize(): void {
    const maxNodeX = Math.max(...this.nodes.map((node) => node.x));
    const maxNodeY = Math.max(...this.nodes.map((node) => node.y));

    const totalWidth = Math.max(maxNodeX + 200, window.innerWidth);
    const totalHeight = Math.max(maxNodeY + 200, window.innerHeight);

    this.svg.attr('width', totalWidth).attr('height', totalHeight);
    this.updateGraph();
  }

  private calculateWidth(text: string): number {
    const maxCharsPerLine = 20; // 每行最多显示字符数
    return Math.min(text.length * 10, maxCharsPerLine * 10);
  }
  
  private calculateHeight(text: string, width: number): number {
    const words = text.split(' ');
    let lineCount = 1;
    let line = '';
  
    words.forEach((word) => {
      const testLine = `${line}${word} `;
      if (testLine.length > width / 10) {
        lineCount++;
        line = `${word} `;
      } else {
        line = testLine;
      }
    });
  
    return lineCount * 16; // 每行高度固定为 16px
  }

  private updatePlusButton(): void {
    if (this.nodes.length < 2) return;
  
    const latestNode = this.nodes[this.nodes.length - 2];
    const resultNode = this.nodes[this.nodes.length - 1];
  
    if (!latestNode || !resultNode) return;
  
    const plusX = (latestNode.x + resultNode.x) / 2; // 加号位置 x 坐标
    const plusY = (latestNode.y + resultNode.y) / 2; // 加号位置 y 坐标
  
    this.svg.selectAll('.add-button').remove(); // 清理旧按钮
  
    this.svg
      .append('text')
      .attr('class', 'add-button')
      .attr('x', plusX)
      .attr('y', plusY)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', 'black')
      .style('font-size', '24px')
      .style('cursor', 'pointer')
      .text('+')
      .on('click', () => this.onAddBehavior()); // 点击触发行为添加逻辑
  }
  
  
  private updateGraph(): void {
    this.svg.selectAll('*').remove();
  
    this.svg
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('x1', (d: Link) => this.getNodeById(d.source).x)
      .attr('y1', (d: Link) => this.getNodeById(d.source).y)
      .attr('x2', (d: Link) => this.getNodeById(d.target).x)
      .attr('y2', (d: Link) => this.getNodeById(d.target).y)
      .attr('stroke', '#999')
      .attr('stroke-width', 2);
  
    const nodeGroup = this.svg
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`);
  
    nodeGroup
      .append('rect')
      .attr('width', (d: Node) => this.calculateWidth(d.name))
      .attr('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)))
      .attr('x', (d: Node) => -this.calculateWidth(d.name) / 2)
      .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2)
      .attr('fill', (d: Node) => (d.id === this.nodes.length ? '#f44336' : '#2196f3'))
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2);
  
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .style('fill', 'black')
      .style('font-size', '12px')
      .text((d: Node) => d.name);
  
    this.updatePlusButton();
  }
  
  

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }

  onAddBehavior(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('用户ID未找到，请检查 localStorage！');
      return;
    }
  
    const actionsTaken = this.nodes
      .filter((node) => node.id !== this.nodes[this.nodes.length - 1].id)
      .map((node) => node.name);
  
    this.apiService.postUpdateMap(userId, actionsTaken, this.newDesc).subscribe({
      next: (response: UpdateMapResponse) => {
        if (response.code === 0) {
          console.log('后端响应成功:', response);
  
          // 更新推荐行为列表
          this.recommendedActions = response.data.actionList;
  
          // 更新最后的结果节点
          const resultNode = this.nodes[this.nodes.length - 1];
          const preRes = response.data.preRes[0]; // 选择第一个结局
          resultNode.name = `${preRes.des} (${preRes.prob}%)`;
  
          this.updateGraph(); // 更新画布
          this.showRecommendations = true; // 显示推荐行为
        } else {
          console.error('后端响应失败:', response.msg);
        }
      },
      error: (err) => {
        console.error('调用 updateMap API 出错:', err);
      },
    });
  }
  
  selectBehavior(action: string): void {
    const latestNode = this.nodes[this.nodes.length - 2];
    const resultNode = this.nodes[this.nodes.length - 1];
  
    const newNode: Node = {
      id: this.nodes.length + 1,
      name: action,
      x: latestNode.x + 200,
      y: this.height / 2,
    };
  
    // 插入新的行为节点
    this.nodes.splice(this.nodes.length - 1, 0, newNode);
  
    // 更新链接关系
    this.links = [
      ...this.links.filter((link) => link.target !== resultNode.id),
      { source: latestNode.id, target: newNode.id },
      { source: newNode.id, target: resultNode.id },
    ];
  
    // 隐藏推荐行为
    this.showRecommendations = false;
  
    // 更新画布
    this.updateGraph();
  }
  

  submitNewDesc(): void {
    if (this.newDesc.trim()) {
      const userId = localStorage.getItem('userId');
      this.messages.push(this.newDesc);
      if (!userId) {
        console.error('用户ID未找到！');
        return;
      }

      const actionsTaken = this.nodes.map((node) => node.name);

      this.apiService
        .postUpdateMap(userId, actionsTaken, this.newDesc)
        .subscribe({
          next: (response) => {
            console.log('补充信息提交成功:', response);
          },
          error: (err) => {
            console.error('补充信息提交失败:', err);
          },
        });

      this.newDesc = ''; // 清空输入框
    }
  }
}
