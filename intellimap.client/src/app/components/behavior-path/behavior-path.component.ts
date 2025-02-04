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
  // 保存链式关系：这里始终保持 nodes 中相邻节点之间有连线
  private links: Link[] = [];
  public recommendedActions: string[] = [];
  public showRecommendations = false;
  public newDesc = ''; // 统一使用 newDesc 表示补充信息
  public aiResult: any;
  public messages: string[] = []; // 消息列表
  showInputBox = false; // 默认隐藏输入框

  // 切换输入框显示状态
  toggleInputBox() {
    this.showInputBox = !this.showInputBox;
  }

  // 点击空白处自动收起
  hideInputBox() {
    this.showInputBox = false;
  }

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
      .attr('width', '100%')
      .attr('height', '100%')
      .style('border', '1px solid #ddd');
  }

  private processAiResult(aiResult: any): void {
    const actionList = aiResult.actionList || ['Default Action'];
    const preRes = aiResult.preRes?.[0] || { des: 'Unknown Result', prob: 0 };

    // 默认链条：一个默认行为节点和一个结果节点
    this.nodes = [
      { id: 1, name: actionList[0], x: 100, y: this.height / 2 },
      { id: 2, name: `${preRes.des} (${preRes.prob}%)`, x: this.width - 100, y: this.height / 2 },
    ];
    // 构造初始连线（始终连成一条直线）
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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
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
      const wordWidth = this.getTextMetrics(word + ' ').width;
      if (currentLineWidth + wordWidth > width) {
        lineCount++;
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += wordWidth;
      }
    });

    return lineCount * lineHeight + padding;
  }

  /**
   * 在现有 plus 按钮更新方法基础上，此处无需修改
   */
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
      .on('click', () => this.onAddBehavior());

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
      .on('click', () => this.onAddBehavior())
      .on('mouseover', function (this: SVGTextElement) {
        d3.select(this).style('fill', 'yellow').style('font-size', '30px');
        d3.select(this.parentNode as Element)
          .select('circle')
          .attr('r', 25); // 放大圆
      })
      .on('mouseout', function (this: SVGTextElement) {
        d3.select(this).style('fill', 'white').style('font-size', '24px');
        d3.select(this.parentNode as Element)
          .select('circle')
          .attr('r', 20); // 恢复圆大小
      });
  }

  /**
   * 更新图形：重新绘制连线和节点，并为节点添加拖拽和删除功能
   */
  private updateGraph(): void {
    // 清理旧图形
    this.svg.selectAll('g').remove();
    this.svg.selectAll('line').remove();

    // 重新构造连线（链状结构：相邻节点之间连接）
    this.links = [];
    for (let i = 0; i < this.nodes.length - 1; i++) {
      this.links.push({ source: this.nodes[i].id, target: this.nodes[i + 1].id });
    }

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

    const self = this; // 保存组件上下文

    // 绘制节点组，并添加拖拽行为
    const nodeGroup = this.svg
      .selectAll('g')
      .data(this.nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`)
      .call(
        d3.drag<SVGGElement, Node>()
          .on('start', function (event, d) {
            // 提升节点到最上层，并添加 dragging 类
            d3.select(this).raise().classed('dragging', true);
          })
          .on('drag', function (event, d) {
            d.x = event.x;
            d.y = event.y;
            d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
            self.svg.selectAll('line')
              .attr('x1', (l: Link) => self.getNodeById(l.source).x)
              .attr('y1', (l: Link) => self.getNodeById(l.source).y)
              .attr('x2', (l: Link) => self.getNodeById(l.target).x)
              .attr('y2', (l: Link) => self.getNodeById(l.target).y);
          })
          .on('end', function (event, d) {
            // 拖拽结束时移除 dragging 类
            d3.select(this).classed('dragging', false);
          })
      );
      

    // 添加矩形节点（根据是否为结果节点设置不同的 class）
    nodeGroup
      .append('rect')
      .attr('class', (d: Node, i:number) =>
        // 如果该节点是最后一个结果节点，则使用 node-last，否则使用 node-default
        i === this.nodes.length - 1 ? 'node-rect node-last' : 'node-rect node-default'
      )
      .attr('width', (d: Node) => this.calculateWidth(d.name) + 16)
      .attr('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)) + 16)
      .attr('x', (d: Node) => -this.calculateWidth(d.name) / 2 - 8)
      .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2 - 8)
      .attr('stroke-width', 2);

    // 添加文本信息（使用 foreignObject 来支持富文本显示）
    nodeGroup
      .append('foreignObject')
      .attr('x', (d: Node) => -this.calculateWidth(d.name) / 2) // 对齐矩形
      .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2)
      .attr('width', (d: Node) => this.calculateWidth(d.name))
      .attr('height', (d: Node) => this.calculateHeight(d.name, this.calculateWidth(d.name)))
      .attr('xmlns', 'http://www.w3.org/1999/xhtml')
      .append('xhtml:div')
      .style('width', (d: Node) => `${this.calculateWidth(d.name)}px`)
      .style('height', (d: Node) => `${this.calculateHeight(d.name, this.calculateWidth(d.name))}px`)
      .style('display', 'flex')
      .style('justify-content', 'flex-start')
      .style('align-items', 'stretch')
      .style('padding', '4px')
      .style('font-size', '12px')
      .style('font-family', "'Open Sans', sans-serif")
      .style('color', 'white')
      .style('text-align', 'left')
      .style('word-wrap', 'break-word')
      .html((d: Node) => d.name);

    // 为除第一个默认行为和最后一个结果节点以外的节点添加删除按钮
    // 此处通过 data 的 index 判断：第一个节点（index 0）和最后一个节点（index === nodes.length-1）不可删除
    nodeGroup
      .filter((d:Node, i:number) => i !== 0 && i !== self.nodes.length - 1)
      .append('text')
      .attr('class', 'delete-button')
      // 计算删除按钮位置：位于矩形的右上角（可根据需要调整偏移量）
      .attr('x', (d: Node) => this.calculateWidth(d.name) / 2 + 8 - 10)
      .attr('y', (d: Node) => -this.calculateHeight(d.name, this.calculateWidth(d.name)) / 2 - 8 + 10)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', 'red')
      .style('font-size', '14px')
      .style('cursor', 'pointer')
      .text('×')
      .on('click', (event: MouseEvent, d:Node) => {
        // 阻止事件冒泡，防止触发拖拽
        event.stopPropagation();
        self.deleteNode(d);
      });

    // 更新加号按钮（添加行为）
    this.updatePlusButton();
  }

  private getNodeById(id: number): Node {
    return this.nodes.find((node) => node.id === id) as Node;
  }

  /**
   * 删除节点：只有中间节点可删除（默认行为节点和结果节点不允许删除），删除后自动重连前后节点
   */
  private deleteNode(nodeToDelete: Node): void {
    // 找到节点在 nodes 数组中的位置
    const index = this.nodes.findIndex((n) => n.id === nodeToDelete.id);
    // 如果是默认行为节点或结果节点，则不允许删除
    if (index === 0 || index === this.nodes.length - 1) {
      console.warn('默认行为节点或结果节点不允许删除！');
      return;
    }
    // 删除节点
    this.nodes.splice(index, 1);
    // 重新构造链状连线：即将被删除节点前后的节点直接连接
    // 由于 updateGraph() 内部会根据 this.nodes 重新生成 this.links，因此只需调用 updateGraph 即可
    this.updateGraph();
  }

  onAddBehavior(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('用户ID未找到，请检查 localStorage！');
      return;
    }

    // 获取已执行的行为，排除最后一个结果节点
    const actionsTaken = this.nodes
      .filter((node, i) => i !== this.nodes.length - 1)
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

    // 在结果节点之前插入新的行为节点
    this.nodes.splice(this.nodes.length - 1, 0, newNode);
    // 更新连线（updateGraph 内部会根据 nodes 顺序重建 links）
    this.updateGraph();
    // 隐藏推荐行为
    this.showRecommendations = false;
  }

  submitNewDesc(): void {
    if (this.newDesc.trim()) {
      const userId = localStorage.getItem('userId');
      this.messages.push(this.newDesc);
      this.showInputBox = false; // 发送后隐藏输入框
      if (!userId) {
        console.error('用户ID未找到！');
        return;
      }

      const actionsTaken = this.nodes.map((node) => node.name);

      this.apiService.postUpdateMap(userId, actionsTaken, this.newDesc).subscribe({
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
