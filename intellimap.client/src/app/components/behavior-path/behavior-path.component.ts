import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

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
})
export class BehaviorPathComponent implements OnInit {
  private svg: any;
  private width = 800;
  private height = 600;
  private nodes: Node[] = [
    { id: 1, name: '默认行为', x: 100, y: 300 },
    { id: 2, name: '结果', x: 500, y: 300 },
  ];
  private links: Link[] = [
    { source: 1, target: 2 }, // 默认行为指向结果
  ];

  ngOnInit(): void {
    this.createSvg();
    this.updateGraph();
  }

  private createSvg(): void {
    this.svg = d3
      .select('#behaviorPathContainer')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('border', '1px solid #ccc');

    // 监听节点点击事件
    this.svg.on('click', (event: MouseEvent) => this.addBehavior(event));
  }

  private updateGraph(): void {
    // 清空旧图表
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
      .attr('stroke', '#ccc')
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
      .attr('r', 30)
      .attr('fill', (d: Node) => (d.id === 1 || d.id === 2 ? '#2196f3' : '#4caf50'));

    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '14px')
      .text((d: Node) => d.name);
  }

  private addBehavior(event: MouseEvent): void {
    const coords = d3.pointer(event);

    // 获取最后一个行为节点的 ID（默认行为 -> 结果之间）
    const lastBehaviorId = this.nodes.length - 1;
    const newNodeId = this.nodes.length + 1;

    // 插入新节点
    const newNode: Node = {
      id: newNodeId,
      name: `行为 ${newNodeId - 2}`,
      x: coords[0],
      y: coords[1],
    };
    this.nodes.splice(lastBehaviorId, 0, newNode);

    // 更新连线
    this.links = this.links.filter((link) => link.source !== 1 || link.target !== 2); // 删除默认行为到结果的直接连线
    this.links.push(
      { source: 1, target: newNodeId }, // 默认行为 -> 新节点
      { source: newNodeId, target: 2 } // 新节点 -> 结果
    );

    this.updateGraph();
  }

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }
}
