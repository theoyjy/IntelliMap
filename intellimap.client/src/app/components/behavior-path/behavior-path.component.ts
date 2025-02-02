import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';

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
  private width = 800;
  private height = 600;
  private nodes: Node[] = [];
  private links: Link[] = [];
  public aiResult: any;

  constructor() {}

  ngOnInit(): void {
    this.createSvg();

    // 从 LocalStorage 获取数据
    const storedResult = localStorage.getItem('aiResult');
    if (storedResult) {
      this.aiResult = JSON.parse(storedResult);

      // 清除 LocalStorage 数据，避免重复使用
      localStorage.removeItem('aiResult');

      this.processAiResult(this.aiResult);
    } else {
      console.error('AI 结果未找到，请确保问卷页面已正确存储数据！');
    }
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
    // 如果后端返回的不是数组，而是单个字符串
    const actionList = aiResult.defAct ? [aiResult.defAct] : []; // 转换为数组
    const preRes = aiResult.preRes || { des: '未知结果', prob: 0 };

    // 构造行为节点
    this.nodes = actionList.map((action: string, index: number) => ({
      id: index + 1,
      name: action,
      x: 150 + index * 300,
      y: 300,
    }));

    // 添加结果节点
    this.nodes.push({
      id: this.nodes.length + 1,
      name: `${preRes.des} (${(preRes.prob * 100).toFixed(2)}%)`,
      x: 150 + this.nodes.length * 300,
      y: 300,
    });

    // 构造连线
    this.links = this.nodes.slice(0, -1).map((node, index) => ({
      source: node.id,
      target: this.nodes[index + 1].id,
    }));

    this.adjustCanvasSize();
    this.updateGraph();
  }

  private adjustCanvasSize(): void {
    this.width = Math.max(800, this.nodes.length * 300);
    this.svg.attr('width', this.width);
  }

  private updateGraph(): void {
    // 清空画布
    this.svg.selectAll('*').remove();
  
    // 绘制连线（弧线）
    this.svg
      .selectAll('path')
      .data(this.links)
      .enter()
      .append('path')
      .attr('d', (d: Link) => {
        const source = this.getNodeById(d.source);
        const target = this.getNodeById(d.target);
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);
  
    // 绘制节点
    const nodeGroup = this.svg
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`);
  
    nodeGroup
      .append('circle')
      .attr('r', 35)
      .attr('fill', (d: Node) => (d.id === this.nodes.length ? '#4caf50' : '#2196f3'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', (event: MouseEvent) => {
        d3.select(event.currentTarget as SVGCircleElement)
          .attr('r', 40)
          .attr('fill', '#ff9800');
      })
      .on('mouseout', (event: MouseEvent, d: Node) => {
        d3.select(event.currentTarget as SVGCircleElement)
          .attr('r', 35)
          .attr('fill', d.id === this.nodes.length ? '#4caf50' : '#2196f3');
      });
      
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '14px')
      .text((d: Node) => d.name);
  }
  

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }
}
