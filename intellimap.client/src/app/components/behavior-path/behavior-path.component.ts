import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

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

@Component({
  selector: 'app-behavior-path',
  templateUrl: './behavior-path.component.html',
  styleUrls: ['./behavior-path.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class BehaviorPathComponent implements OnInit {
  private svg: any;
  private width = 1200;
  private height = 800;
  private nodes: Node[] = [];
  private links: Link[] = [];
  public recommendedActions: string[] = [];
  public showRecommendations: boolean = false;
  public aiResult: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.createSvg();

    // 读取本地存储的 AI 结果
    const storedResult = localStorage.getItem('aiResult');
    if (storedResult) {
      this.aiResult = JSON.parse(storedResult);
      console.log("AI 结果解析成功:", this.aiResult);  // 调试输出
      localStorage.removeItem('aiResult');
      this.processAiResult(this.aiResult);
    } else {
      console.error('AI 结果未找到，请确保问卷页面已正确存储数据！');
    }

    // 监听窗口大小变化
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
    // 只取第一个默认行为和第一个可能的结果
    const actionList = aiResult.actionList || ['默认行为'];
    const preRes = aiResult.preRes && aiResult.preRes.length > 0
      ? aiResult.preRes[0]
      : { des: '未知结果', prob: 0 };

    this.nodes = [
      { id: 1, name: actionList[0], x: 100, y: this.height / 2 },
      { id: 2, name: `${preRes.des} (${preRes.prob}%)`, x: this.width - 100, y: this.height / 2 },
    ];

    this.links = [{ source: 1, target: 2 }];

    this.updateGraph();
  }

  private adjustCanvasSize(): void {
    const maxNodeX = Math.max(...this.nodes.map(node => node.x));
    const maxNodeY = Math.max(...this.nodes.map(node => node.y));

    const totalWidth = Math.max(maxNodeX + 200, window.innerWidth);
    const totalHeight = Math.max(maxNodeY + 200, window.innerHeight);

    this.svg.attr('width', totalWidth).attr('height', totalHeight);
    this.updateGraph();
  }

  private updateGraph(): void {
    this.svg.selectAll('*').remove();
  
    // 绘制连线
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
  
    // 绘制节点组
    const nodeGroup = this.svg
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`);
  
      nodeGroup
      .append('rect') // 绘制矩形
      .attr('width', (d: Node) => (d.id === this.nodes.length ? 200 : 100)) // 动态宽度
      .attr('height', (d: Node) => this.calculateHeight(d.name, 200)) // 根据文字高度调整矩形高度
      .attr('x', (d: Node) => -((d.id === this.nodes.length ? 200 : 100) / 2)) // 居中
      .attr('y', (d: Node) => -this.calculateHeight(d.name, 200) / 2)
      .attr('fill', (d: Node) => (d.id === this.nodes.length ? '#f44336' : '#2196f3'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
      nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .each(function (this: SVGTextElement, d: Node) { // 显式声明 this 的类型为 SVGTextElement
        const textElement = d3.select<SVGTextElement, Node>(this); // 确保类型正确
        const maxWidth = d.id === nodeGroup.size() ? 200 : 100; // 动态设置宽度
        const words = d.name.split(' ');
    
        let line = '';
        let lineNumber = 0;
        const lineHeight = 16; // 每行文字高度
        const y = 0;
    
        const tspan = textElement
          .append('tspan')
          .attr('x', 0)
          .attr('y', y)
          .attr('dy', `${lineHeight * lineNumber - (words.length / 2) * lineHeight}px`);
    
        words.forEach((word) => {
          const testLine = `${line}${word} `;
          tspan.text(testLine);
          if (tspan.node()!.getComputedTextLength() > maxWidth) {
            line = `${word} `;
            lineNumber++;
            textElement
              .append('tspan')
              .attr('x', 0)
              .attr('y', y)
              .attr('dy', `${lineHeight * lineNumber - (words.length / 2) * lineHeight}px`)
              .text(word);
          } else {
            line = testLine;
          }
        });
      });
    
  
  
    // 更新加号按钮
    this.updatePlusButton();
  }
  
  private calculateHeight(text: string, width: number): number {
    const words = text.split(' ');
    let lineCount = 1;
    let line = '';
  
    words.forEach((word) => {
      const testLine = `${line}${word} `;
      if (testLine.length > width / 10) { // 假设每字符占 10px
        lineCount++;
        line = `${word} `;
      } else {
        line = testLine;
      }
    });
  
    return lineCount * 16; // 每行高度为 16px
  }
  

  private updatePlusButton(): void {
    const latestNode = this.nodes[this.nodes.length - 2]; // 获取最新行为节点
    const resultNode = this.nodes[this.nodes.length - 1]; // 结果节点

    if (!latestNode || !resultNode) return;

    const plusX = (latestNode.x + resultNode.x) / 2;
    const plusY = (latestNode.y + resultNode.y) / 2;

    // 移除旧的加号
    this.svg.selectAll('.add-button').remove();

    // 添加新的加号
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
      .on('click', () => this.onAddBehavior());
  }

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }

  onAddBehavior(): void {
    // 显示推荐行为列表
    this.recommendedActions = this.aiResult.actionList || [];
    this.showRecommendations = true;
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

    this.nodes.splice(this.nodes.length - 1, 0, newNode);

    this.links = [
      ...this.links.filter((link) => link.target !== resultNode.id),
      { source: latestNode.id, target: newNode.id },
      { source: newNode.id, target: resultNode.id },
    ];

    this.updateGraph();
  }
}
