import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule],
})


export class BehaviorPathComponent implements OnInit {
  private svg: any;
  private width = 1209;
  private height = 923;
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
    //   .style('background-color', '#f9f9f9')
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

    private getTextMetrics(text: string, fontSize: number = 12) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${fontSize}px sans-serif`; // 确保与 SVG 中样式一致
        return context.measureText(text);
    }

    private calculateWidth(text: string): number {
        const maxWidth = 200; // 最大宽度 200px
        const measuredWidth = this.getTextMetrics(text).width;
        return Math.min(measuredWidth, maxWidth);
    }

    private calculateHeight(text: string, width: number): number {
        const fontSize = 12; // 必须与 CSS 中设置的 font-size 一致
        const lineHeight = 16; // 必须与 CSS 中 line-height 一致（例如 1.33 * 12px ≈ 16px）
        const padding = 16; // 8px 上下 padding 总和

        const words = text.split(' ');
        let lineCount = 1;
        let currentLineWidth = 0;

        words.forEach((word) => {
            // 测量单词宽度（包含空格）
            const wordWidth = this.getTextMetrics(word + ' ').width;
            // 换行判断
            if (currentLineWidth + wordWidth > width) {
                lineCount++;
                currentLineWidth = wordWidth;
            } else {
                currentLineWidth += wordWidth;
            }
        });

        return lineCount * lineHeight + padding; // 总高度 = 行数 * 行高 + 上下 padding
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
      .append('circle')
      .attr('class', 'add-button')
      .attr('cx', plusX)
      .attr('cy', plusY)
      .attr('r', 20) // 圆的半径
      .style('fill', 'red')
      .style('cursor', 'pointer')
      .on('click', () => this.onAddBehavior()); // 点击触发行为添加逻辑

    this.svg
      .append('text')
      .attr('class', 'add-button')
      .attr('x', plusX)
      .attr('y', plusY)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', 'white')
      .style('font-size', '24px')
      .style('cursor', 'pointer')
      .text('+')
      .on('click', () => this.onAddBehavior()) // 点击触发行为添加逻辑
      .on('mouseover', function(this: SVGTextElement) {
        d3.select(this).style('fill', 'yellow').style('font-size', '30px');
        d3.select(this.parentNode as Element).select('circle').attr('r', 25); // 放大圆
      })
      .on('mouseout', function(this: SVGTextElement) {
        d3.select(this).style('fill', 'white').style('font-size', '24px');
        d3.select(this.parentNode as Element).select('circle').attr('r', 20); // 恢复圆大小
      });
  }
  
  
  private updateGraph(): void {
    this.svg.selectAll('g').remove();
    this.svg.selectAll('line').remove();
  
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
          .attr('class', (d: Node) => d.id === this.nodes.length ? 'node-rect node-last' : 'node-rect node-default')
          .attr('width', (d: Node) => this.calculateWidth(d.name) + 16)
          .attr('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)) + 16)
          .attr('x', (d: Node) => -this.calculateWidth(d.name) / 2 - 8)
          .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2 - 8)
          .attr('stroke-width', 2);

      nodeGroup
          .append('foreignObject')
          .attr('x', (d: Node) => -this.calculateWidth(d.name) / 2) // Align with rect
          .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2) // Align with rect
          .attr('width', (d: Node) => this.calculateWidth(d.name)) // Include padding
          .attr('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)))
          .attr('xmlns', 'http://www.w3.org/1999/xhtml')
          .append('xhtml:div')
          .style('width', (d: Node) => this.calculateWidth(d.name))
          .style('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)))
          .style('display', 'flex')
          .style('justify-content', 'flex-start') // Correct flex value
          .style('align-items', 'stretch')
          .style('padding', '4px')
          .style('font-size', '12px')
          .style('font-family', "'Open Sans', sans-serif")
          .style('color', 'white')
          .style('text-align', 'left')
          .style('word-wrap', 'break-word')
          .html((d: Node) => d.name);
  
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
