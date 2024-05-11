import * as d3 from 'd3';
import powerbi from 'powerbi-visuals-api';
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

export class Visual implements IVisual {
    private svg: d3.Selection<SVGSVGElement, any, any, any>;
    private container: d3.Selection<SVGElement, any, any, any>;

    constructor(options: VisualConstructorOptions) {
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('myD3Visual', true);

        // SVG içinde bir konteyner oluşturun.
        this.container = this.svg.append("g");
    }

    public update(options: VisualUpdateOptions): void {
        this.container.selectAll("*").remove();
        
        // SVG'nin boyutlarını ayarlayın.
        let width = options.viewport.width;
        let height = options.viewport.height;
        this.svg.attr("width", width).attr("height", height);

        // Verilerinizi işleyin.
        let dataView = options.dataViews[0];
        let names: any[] = [];
        let values: any[] = [];
        let periods: any[] = []; // 'period' verisini alın

        dataView.table.rows.forEach((row: any) => {
            names.push(row[0])
            values.push(row[1])
            periods.push(row[2])
        })


        // En küçük periyodu bulun
        let minPeriod = Math.min(...periods);

        // Seçilen periyodu alın (örneğin, bir slider kullanarak)
        let selectedPeriod = options.dataViews[0].single && options.dataViews[0].single.value ? options.dataViews[0].single.value : minPeriod;

        // Sadece seçilen periyodun verilerini alın
        let filteredData = names.map((category: any, i: number) => {
            if (periods[i] === selectedPeriod) {
                return {
                    category: category,
                    value: values[i]
                };
            }
        }).filter(d => d !== undefined);

        let groupedData = Array.from(d3.group(filteredData, (d: { category: any; value: any; }) => d.category), ([key, value]) => ({ key, value: d3.sum(value, (d: { category: any; value: any; }) => d.value) }));

        // Treemap düzenini oluşturun.
        let treemap = d3.treemap()
            .size([width, height])
            .padding(1)
            .round(true);

        // Hiyerarşik veri yapısını oluşturun.
        let root = d3.hierarchy({ children: groupedData })
            .sum((d: any) => d.value);

        // Treemap düzenini uygulayın.
        treemap(root);

        // Renk ölçeği oluşturun.
        let color = d3.scaleOrdinal(d3.schemeCategory10);

        // Düğümleri çizin.
        let nodes = this.container.selectAll(".node")
            .data(root.leaves())
            .enter().append("g");

        nodes.append("rect")
            .attr("class", "node")
            .attr("fill", (d: any) => color(d.data.key))
            .attr("x", (d: any) => d.x0)
            .attr("y", (d: any) => d.y0)
            .attr("width", (d: any) => d.x1 - d.x0)
            .attr("height", (d: any) => d.y1 - d.y0);

        // İsimleri ve değerleri ekleyin.
        nodes.append("text")
            .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
            .attr("y", (d: any) => d.y0 + 20) // 20 piksel aşağı kaydır
            .text((d: any) => d.data.key); // İsim

        nodes.append("text")
            .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
            .attr("y", (d: any) => d.y1 - 5) // 5 piksel yukarı kaydır
            .text((d: any) => d.data.value); // Değer


    }
}
