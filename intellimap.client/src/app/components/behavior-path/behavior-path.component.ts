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
  
    const storedResult = localStorage.getItem('aiResult');
    if (storedResult) {
      this.aiResult = JSON.parse(storedResult);
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
      .attr('width', this.width) // 固定宽度
      .attr('height', this.height) // 固定高度
      .style('background-color', '#f9f9f9')
      .style('border', '1px solid #ddd');
  }
  

  private processAiResult(aiResult: any): void {
    const actionList = aiResult.defAct ? [aiResult.defAct] : ['默认行为'];
    const preRes = aiResult.preRes || { des: '未知结果', prob: 0 };

    
  this.nodes = [
    { id: 1, name: actionList[0], x: 100, y: this.height / 2 }, // 固定在最左侧
    { id: 2, name: `${preRes.des} (${(preRes.prob * 100).toFixed(2)}%)`, x: this.width - 100, y: this.height / 2 }, // 固定在最右侧
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

    // 绘制加号按钮
    this.updatePlusButton();

    // 绘制节点组
    const nodeGroup = this.svg
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`)
      .call(
        d3.drag<SVGCircleElement, Node>()
          .on('start', (event, d) => this.onDragStart(event, d))
          .on('drag', (event, d) => this.onDrag(event, d))
          .on('end', (event, d) => this.onDragEnd(event, d))
      );
      

    nodeGroup
      .append('circle')
      .attr('r', 35)
      .attr('fill', '#2196f3')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '14px')
      .text((d: Node) => d.name);
  }

  private updatePlusButton(): void {
    const latestNode = this.nodes[this.nodes.length - 2]; // 获取最新行为节点
    const resultNode = this.nodes[this.nodes.length - 1]; // 结果节点
  
    if (!latestNode || !resultNode) return; // 避免出错
  
    const plusX = (latestNode.x + resultNode.x) / 2; // 计算加号位置
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
      .on('click', () => this.onAddBehavior()); // 绑定点击事件
  }
  
  

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }

  private onDragStart(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node): void {
    d3.select(event.sourceEvent.target).attr('stroke', 'yellow'); // 高亮当前节点
  }
  
  private onDrag(event: any, d: Node): void {
    const svgWidth = parseFloat(this.svg.attr('width'));
    const svgHeight = parseFloat(this.svg.attr('height'));

    d.x = Math.max(50, Math.min(event.x, svgWidth - 50));
    d.y = Math.max(50, Math.min(event.y, svgHeight - 50));
  
    // 更新节点位置
    d3.select(event.sourceEvent.target.parentNode)
      .attr('transform', `translate(${d.x}, ${d.y})`);
  
    // 更新连线和加号位置
    this.svg
      .selectAll('line')
      .attr('x1', (link: Link) => this.getNodeById(link.source).x)
      .attr('y1', (link: Link) => this.getNodeById(link.source).y)
      .attr('x2', (link: Link) => this.getNodeById(link.target).x)
      .attr('y2', (link: Link) => this.getNodeById(link.target).y);
  
    this.updatePlusButton();
  }
  
  
  
  
  private onDragEnd(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node): void {
    d3.select(event.sourceEvent.target).attr('stroke', '#fff'); // 恢复节点样式
  }
  

  onAddBehavior(): void {
    this.recommendedActions = ['行为 1', '行为 2', '行为 3'];
    this.showRecommendations = true;
  }

  selectBehavior(action: string): void {
    const latestNode = this.nodes[this.nodes.length - 2];
    const resultNode = this.nodes[this.nodes.length - 1];

    const newNode: Node = {
        id: this.nodes.length + 1,
        name: action,
        x: latestNode.x + 200, // 新节点的 X 坐标，右移
        y: this.height / 2,    // 固定 Y 坐标在画布中间
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
