import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';

export interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'action' | 'result' | 'hidden';
}

export interface Link {
  source: string;
  target: string;
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
  // 画布与节点数据
  private svg: any;
  private width = 1209;
  private height = 923;
  private nodes: Node[] = [];
  private links: Link[] = [];

  // 固定隐藏节点
  private hiddenNode: Node = {
    id: "uuid",
    name: '',
    x: 0,
    y: 0,
    type: 'hidden'
  };

  // 用于控制行为节点与隐藏节点之间的水平间距
  private readonly hiddenOffset = 200;

  // AI相关数据
  public aiResult: any;
  public recommendedActions: string[] = [];
  public showRecommendations = false;
  public newDesc = '';       // 补充描述信息
  public messages: string[] = [];   // 记录提交的描述信息

  // 输入框显示控制
  showInputBox = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.createSvg();

    // 从localStorage读取AI结果并初始化
    const storedResult = localStorage.getItem('aiResult');
    if (storedResult) {
      this.aiResult = JSON.parse(storedResult);
      console.log('AI 结果解析成功:', this.aiResult);
      localStorage.removeItem('aiResult');
      this.processAiResult(this.aiResult);
    } else {
      console.error('AI 结果未找到，请确保问卷页面已正确存储数据！');
    }

    // 监听窗口大小改变，自动重计算 svg 大小
    window.addEventListener('resize', () => this.adjustCanvasSize());
  }

  // 创建svg
  private createSvg(): void {
    this.svg = d3.select('#behaviorPathContainer')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .style('border', '1px solid #ddd');
  }

  // 切换输入框显示状态
  toggleInputBox() {
    this.showInputBox = !this.showInputBox;
  }

  /**
   * 根据 AI 返回结果初始化：
   * 1. 创建初始行为节点（type='action'）
   * 2. 创建隐藏节点（type='hidden'）
   * 3. 创建结局节点（type='result'），从隐藏节点连到各个结果
   */
  private processAiResult(aiResult: any): void {
    const actionList = aiResult.actionList || ['Default Action'];
    const preResList = aiResult.preRes || [{ des: 'Unknown Result', prob: 0 }];

    // 1. 初始行为节点
    this.nodes = [
      {
        id: crypto.randomUUID(),
        name: actionList[0],
        x: 100,
        y: this.height / 2,
        type: 'action'
      }
    ];
    actionList.splice(0, 1);
    this.recommendedActions = actionList;
    // 2. 隐藏节点
    this.hiddenNode = {
      id: crypto.randomUUID(),
      name: '',
      x: this.nodes[0].x + this.hiddenOffset,
      y: this.nodes[0].y,
      type: 'hidden'
    };
    this.nodes.push(this.hiddenNode);

    // 3. 计算结局节点位置
    const totalResults = preResList.length;
    const resultSpacing = 100;
    const startY = this.height / 2 - ((totalResults - 1) * resultSpacing) / 2;

    const resultNodes: Node[] = preResList.map((res: PreRes, index: number) => ({
      id: crypto.randomUUID(), // 这里从3开始分配ID
      name: `${res.des} (${res.prob}%)`,
      x: this.width - 200,
      y: startY + index * resultSpacing,
      type: 'result'
    }));
    this.nodes.push(...resultNodes);

    // action 0 -> hidden Node
    this.links = [{
      source: this.nodes[0].id,
      target: this.hiddenNode.id
    }];

    // 构造连线：隐藏节点 → 结局节点
    this.links.push(...resultNodes.map(r => ({
      source: this.hiddenNode.id,
      target: r.id
    })));

    // 更新图形
    this.updateGraph();
  }

  // 根据窗口大小或节点位置，动态调整 SVG 尺寸
  private adjustCanvasSize(): void {
    const maxNodeX = Math.max(...this.nodes.map(node => node.x));
    const maxNodeY = Math.max(...this.nodes.map(node => node.y));
    const totalWidth = Math.max(maxNodeX + 200, window.innerWidth);
    const totalHeight = Math.max(maxNodeY + 200, window.innerHeight);

    // 这里根据需求可自行调整；如果只需要自适应视图，通常只需 viewBox 即可
    this.svg
      .attr('width', totalWidth)
      .attr('height', totalHeight);

    // 重新渲染
    this.updateGraph();
  }

  // 测量文本尺寸
  private getTextMetrics(text: string, fontSize: number = 12) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = `${fontSize}px sans-serif`;
    return context.measureText(text);
  }

  // 限制节点文本最大宽度
  private calculateWidth(text: string): number {
    const maxWidth = 200;
    const measuredWidth = this.getTextMetrics(text).width;
    return Math.min(measuredWidth, maxWidth);
  }

  // 根据文本计算节点高度（简单多行估算）
  private calculateHeight(text: string, width: number): number {
    const fontSize = 12;
    const lineHeight = 16;
    const padding = 16;
    const words = text.split(' ');
    let lineCount = 1;
    let currentLineWidth = 0;

    words.forEach(word => {
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

  // 贝塞尔曲线 path
  private getLinkPath(source: Node, target: Node): string {
    const offsetX = (target.x - source.x) / 2;
    return `M${source.x},${source.y} C${source.x + offsetX},${source.y} ${target.x - offsetX},${target.y} ${target.x},${target.y}`;
  }

  // 根据ID找到节点（如果找不到则返回undefined）
  private findNodeById(id: string): Node | undefined {
    return this.nodes.find(n => n.id === id);
  }

  // 严格版：找不到就抛错
  private getNodeById(id: string): Node {
    const found = this.findNodeById(id);
    if (!found) {
      throw new Error(`节点ID ${id} 不存在`);
    }
    return found;
  }

  // 更新加号按钮，在最后一个行为节点右侧
  private updatePlusButton(): void {
    const actionNodes = this.nodes.filter(n => n.type === 'action');
    if (actionNodes.length === 0) return;

    const latestAction = actionNodes[actionNodes.length - 1];
    const plusX = latestAction.x + this.hiddenOffset;
    const plusY = latestAction.y;

    // 先清除旧的加号
    this.svg.selectAll('.add-button').remove();

    // 再添加新的加号
    this.svg
      .append('circle')
      .attr('class', 'add-button add-button-circle')
      .attr('cx', plusX)
      .attr('cy', plusY)
      .attr('r', 20)
      .style('fill', 'red')
      .style('cursor', 'pointer')
      .on('click', () => this.onAddBehavior());

    this.svg
      .append('text')
      .attr('class', 'add-button add-button-text')
      .attr('x', plusX)
      .attr('y', plusY)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', 'white')
      .style('font-size', '24px')
      .style('cursor', 'pointer')
      .text('+')
      .on('click', () => this.onAddBehavior());
  }

  /**
   * 重点：更新图形（节点 + 连线 + 拖拽 + 文本）
   */
  private updateGraph(): void {
    const thisRef = this; // 在内部 function 中使用

    // 最外层容器
    const graphGroup = this.svg.selectAll('g.graph-group').data([null]);
    const graphGroupEnter = graphGroup.enter().append('g').attr('class', 'graph-group');
    const graphGroupMerge = graphGroupEnter.merge(graphGroup);

    // 连线容器，保证它在节点容器后面或前面，取决于你想让线在底层还是顶层
    let linkGroup = graphGroupMerge.selectAll('g.link-group').data([null]);
    const linkGroupEnter = linkGroup.enter().append('g').attr('class', 'link-group');
    linkGroup = linkGroupEnter.merge(linkGroup);

    // 节点容器
    let nodeRootGroup = graphGroupMerge.selectAll('g.node-root-group').data([null]);
    const nodeRootGroupEnter = nodeRootGroup.enter().append('g').attr('class', 'node-root-group');
    nodeRootGroup = nodeRootGroupEnter.merge(nodeRootGroup);

    // 1. 筛选出需要显示的连线（source/target 均存在）
    const visibleLinks = this.links.filter(link => {
      const src = this.findNodeById(link.source);
      const tgt = this.findNodeById(link.target);
      return !!(src && tgt);
    });

    // --- 更新连线 ---
    const linkSelection = linkGroup.selectAll('path.link')
      .data(visibleLinks, (d: Link) => `${d.source}-${d.target}`);

    linkSelection.enter()
      .append('path')
      .attr('class', 'link')
      .merge(linkSelection)
      .attr('d', (d: Link) => {
        const src = thisRef.findNodeById(d.source);
        const tgt = thisRef.findNodeById(d.target);
        if (!src || !tgt) return ''; // 容错
        return thisRef.getLinkPath(src, tgt);
      })
      .attr('stroke', (d: Link) => {
        const src = thisRef.getNodeById(d.source);
        const tgt = thisRef.getNodeById(d.target);
        if (src.type === 'action' && tgt.type === 'hidden') {
          return '#999'; // 虚线部分颜色
        }
        return '#666';
      })
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: Link) => {
        const src = thisRef.getNodeById(d.source);
        const tgt = thisRef.getNodeById(d.target);
        if (src.type === 'action' && tgt.type === 'hidden') {
          return '5,5'; // 虚线
        }
        return '0';
      })
      .attr('fill', 'none');

    linkSelection.exit().remove();

    // --- 更新节点 ---
    // （隐藏节点不显示）
    const visibleNodes = this.nodes.filter(n => n.type !== 'hidden');

    const nodeSelection = nodeRootGroup.selectAll('g.node-group')
      .data(visibleNodes, (d: Node) => d.id);

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node-group')
      // 拖拽
      .call(d3.drag<SVGGElement, Node>()
        .on('start', function (this: SVGGElement, event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
            d3.select<SVGGElement, Node>(this).raise().classed('dragging', true);
        })
        .on('drag', function (this: SVGGElement, event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
          // 更新节点数据
          d.x = event.x;
          d.y = event.y;

          // 更新位置：对整个 g 做 transform
          d3.select<SVGGElement, Node>(this)
            .attr('transform', `translate(${d.x}, ${d.y})`);

          // 更新连线
          linkGroup.selectAll('path.link')
            .attr('d', (l: Link) => {
              const src = thisRef.findNodeById(l.source);
              const tgt = thisRef.findNodeById(l.target);
              if (!src || !tgt) return '';
              return thisRef.getLinkPath(src, tgt);
            });
        })
        .on('end', function (this: SVGGElement, event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
          d3.select(this).classed('dragging', false);
        })
      );
      
    // merge
    const nodeMerge = nodeEnter.merge(nodeSelection)
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`);

    // 绘制矩形
    nodeMerge.selectAll('rect.node-rect')
      .data((d: Node) => [d]) // 每个 node-group 里只放一个 rect
      .join('rect')
      .attr('class', (d: Node) =>
        d.type === 'result' ? 'node-rect node-last' : 'node-rect node-default'
      )
      .attr('width', (d: Node) => thisRef.calculateWidth(d.name) + 16)
      .attr('height', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        return thisRef.calculateHeight(d.name, w) + 16;
      })
      .attr('x', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        return -(w / 2 + 8);
      })
      .attr('y', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        const h = thisRef.calculateHeight(d.name, w);
        return -(h / 2 + 8);
      })
      .attr('stroke-width', 2)
      .attr('rx', 10) // 圆角半径（水平）
      .attr('ry', 10); // 圆角半径（垂直）

      // 添加 hover 时右上角的叉号
nodeMerge.on('mouseenter', function (this: SVGGElement, event: any, d: Node) {
    if (d.type !== 'action') 
        return;
    d3.select(this) // 强制断言 this 为 SVG 元素
      .append('text')
      .attr('class', 'delete-button')
      .attr('x', thisRef.calculateWidth(d.name) / 2)
      .attr('y', -thisRef.calculateHeight(d.name, thisRef.calculateWidth(d.name)) / 2)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '14px')
      .style('cursor', 'pointer')
      .style('fill', 'white')
      .style('color', "white")
      .text('×')
      .on('click', () => thisRef.deleteNode(d));
  })
  
  .on('mouseleave', function (this: SVGGElement) {
    // 鼠标移开时移除叉号
    d3.select(this).selectAll('text.delete-button').remove();
  });

    // 绘制文本（foreignObject可支持多行）
    nodeMerge.selectAll('foreignObject.node-fo')
      .data((d: Node) => [d])
      .join('foreignObject')
      .attr('class', 'node-fo')
      .attr('x', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        return -w / 2;
      })
      .attr('y', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        const h = thisRef.calculateHeight(d.name, w);
        return -h / 2;
      })
      .attr('width', (d: Node) => {
        return thisRef.calculateWidth(d.name);
      })
      .attr('height', (d: Node) => {
        const w = thisRef.calculateWidth(d.name);
        return thisRef.calculateHeight(d.name, w);
      })
      .html((d: Node) => `<div style="color:white; text-align:center; font-size:12px;">${d.name}</div>`);

    nodeSelection.exit().remove();

    // 更新加号按钮
    this.updatePlusButton();
  }

  /**
   * 添加新行为
   * 点击加号后，调用后端接口更新推荐
   */
  onAddBehavior(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('用户ID未找到，请检查 localStorage！');
      return;
    }

    // 获取已有的可见行为
    // const actionNodes = this.nodes.filter(n => n.type === 'action');
    // const actionsTaken = actionNodes.map(n => n.name);

    this.updateGraph();
    this.showRecommendations = true;


    // 调用接口获取新的推荐与结局
    // this.apiService.postUpdateMap(userId, actionsTaken, this.newDesc).subscribe({
    //   next: (response: UpdateMapResponse) => {
    //     if (response.code === 0) {
    //       console.log('后端响应成功:', response);

    //       // 更新“结果”节点示例：这里只改了第一个 result
    //       const firstResultNode = this.nodes.find(n => n.type === 'result');
    //       if (firstResultNode && response.data.preRes.length > 0) {
    //         const preRes = response.data.preRes[0];
    //         firstResultNode.name = `${preRes.des} (${preRes.prob}%)`;
    //       }

         
    //     } else {
    //       console.error('后端响应失败:', response.msg);
    //     }
    //   },
    //   error: err => {
    //     console.error('调用 updateMap API 出错:', err);
    //   }
    // });
  }

  /**
   * 用户在推荐列表中选中某个行为
   */
  selectBehavior(action: string): void {
    const actionNodes = this.nodes.filter(n => n.type === 'action');
    const lastAction = actionNodes[actionNodes.length - 1];
    if (!lastAction) return;

    // 1. 删除从 lastAction → hiddenNode 的连线
    this.links = this.links.filter(link => {
      return !(link.source === lastAction.id && link.target === this.hiddenNode.id);
    });

    // 2. 插入新行为节点
    const newAction: Node = {
      id: crypto.randomUUID(),
      name: action,
      x: lastAction.x + 200,
      y: lastAction.y,
      type: 'action'
    };
    this.nodes.push(newAction);

    // 3. 新行为连线
    this.links.push({ source: lastAction.id, target: newAction.id });      // lastAction → newAction
    this.links.push({ source: newAction.id, target: this.hiddenNode.id }); // newAction → hiddenNode

    // 4. 更新隐藏节点位置
    this.hiddenNode.x = newAction.x + this.hiddenOffset;
    this.hiddenNode.y = newAction.y;

    // 关闭推荐弹窗
    this.showRecommendations = false;

    // 5. 请求新的结局预测
    this.fetchUpdatedPrediction();
  }

  /**
   * 重新向后端请求预测结果，更新 result 节点
   */
  private fetchUpdatedPrediction(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('用户ID未找到，请检查 localStorage！');
      return;
    }

    const actionNodes = this.nodes.filter(n => n.type === 'action');
    const actionsTaken = actionNodes.map(n => n.name);

    this.apiService.postUpdateMap(userId, actionsTaken, this.newDesc).subscribe({
      next: (response: UpdateMapResponse) => {
        if (response.code === 0) {
          console.log('预测结果更新成功:', response);

          // 1. 删除旧的 hiddenNode → result 连线
          this.links = this.links.filter(link => {
            const src = this.findNodeById(link.source);
            const tgt = this.findNodeById(link.target);
            return !(src && src.type === 'hidden' && tgt && tgt.type === 'result');
          });

          // 2. 删除旧的 result 节点
          this.nodes = this.nodes.filter(n => n.type !== 'result');

          // 3. 创建新 result 节点
          const preResList = response.data.preRes;
          const totalResults = preResList.length;
          const resultSpacing = 100;
          const startY = this.height / 2 - ((totalResults - 1) * resultSpacing) / 2;

          const resultNodes: Node[] = preResList.map((res, index) => ({
            id: crypto.randomUUID(),
            name: `${res.des} (${res.prob}%)`,
            x: this.width - 200,
            y: startY + index * resultSpacing,
            type: 'result'
          }));

          this.nodes.push(...resultNodes);

          // 4. 构造新的 hiddenNode → result 连线
          resultNodes.forEach(r => {
            this.links.push({ source: this.hiddenNode.id, target: r.id });
          });

          // 5. 更新图
          this.updateGraph();

          // 6. recommendation
          this.recommendedActions = response.data.actionList;

        } else {
          console.error('更新预测结果失败:', response.msg);
        }
      },
      error: err => {
        console.error('调用 updateMap API 出错:', err);
      }
    });
  }

  /**
   * 删除可见行为节点
   */
  deleteNode(nodeToDelete: Node): void {
    if (nodeToDelete.type !== 'action') {
      console.warn('结局节点不允许删除！');
      return;
    }

    const actionNodes = this.nodes.filter(n => n.type === 'action');
    if (actionNodes.length <= 1) {
      console.warn('必须至少保留一个行为节点！');
      return;
    }

    const actionsTaken = this.nodes.filter(n => n.type === 'action').map(n => n.name);

    // 1. 从 nodes 中删除该节点
    const index = this.nodes.findIndex(n => n.id === nodeToDelete.id);
    if (index === -1) return;
    this.nodes.splice(index, 1);

    // 2. 删除与该节点相关的连线
    this.links = this.links.filter(link => link.source !== nodeToDelete.id && link.target !== nodeToDelete.id);

        
    this.fetchUpdatedPrediction();
    return;
    

    // 3. 重新构造可见的 action → action 连线
    const actions = this.nodes.filter(n => n.type === 'action')
    // 先删掉所有 action → action
    this.links = this.links.filter(l => {
      const src = this.findNodeById(l.source);
      const tgt = this.findNodeById(l.target);
      return !(src && src.type === 'action' && tgt && tgt.type === 'action');
    });
    // 再重建
    for (let i = 0; i < actions.length - 1; i++) {
      this.links.push({ source: actions[i].id, target: actions[i + 1].id });
    }

    // 4. 更新隐藏节点位置
    const latestAction = actions[actions.length - 1];
    this.hiddenNode.x = latestAction.x + this.hiddenOffset;
    this.hiddenNode.y = latestAction.y;

    // 删除原有可见→隐藏连线，再添加最新
    this.links = this.links.filter(link => {
      const tgt = this.findNodeById(link.target);
      return !(tgt && tgt.type === 'hidden');
    });
    this.links.push({ source: latestAction.id, target: this.hiddenNode.id });

    // 更新隐藏→result 连线（先删再加）
    this.links = this.links.filter(link => {
      const src = this.findNodeById(link.source);
      const tgt = this.findNodeById(link.target);
      return !(src && src.type === 'hidden' && tgt && tgt.type === 'result');
    });

    const resultNodes = this.nodes.filter(n => n.type === 'result');
    resultNodes.forEach(r => {
      this.links.push({ source: this.hiddenNode.id, target: r.id });
    });

    // 最后更新图
    this.updateGraph();
  }

  /**
   * 提交补充描述信息
   */
  submitNewDesc(): void {
    if (this.newDesc.trim()) {
      const userId = localStorage.getItem('userId');
      this.messages.push(this.newDesc);
      this.showInputBox = false;

      if (!userId) {
        console.error('用户ID未找到！');
        return;
      }

      const actionsTaken = this.nodes.filter(n => n.type === 'action').map(n => n.name);
      this.apiService.postUpdateMap(userId, actionsTaken, this.newDesc).subscribe({
        next: response => {
          console.log('补充信息提交成功:', response);
          this.recommendedActions = response.data.actionList;
        },
        error: err => {
          console.error('补充信息提交失败:', err);
        }
      });
      this.newDesc = '';
    }
  }
}
