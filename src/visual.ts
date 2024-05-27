import * as d3 from 'd3';
import powerbi from 'powerbi-visuals-api';
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

export class Visual implements IVisual {
    private svg: d3.Selection<SVGSVGElement, any, any, any>;
    private container: d3.Selection<SVGElement, any, any, any>;
    private dv;
    private animationTimeout: number | null = null; // Class-level variable to store the timeout ID


    constructor(options: VisualConstructorOptions) {
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('myD3Visual', true);

        // SVG içinde bir konteyner oluşturun.
        this.container = this.svg.append("g");
    }

    public update(options: VisualUpdateOptions): void {

        if (this.animationTimeout !== null) {
            clearTimeout(this.animationTimeout);
        }

        // SVG'nin boyutlarını ayarlayın.
        let width = options.viewport.width;
        let height = options.viewport.height;
        this.svg.attr("width", width).attr("height", height);

        // Verilerinizi işleyin.
        this.dv = options.dataViews[0];
        let names: any[] = [];
        let values: any[] = [];
        let periods: any[] = []; // 'period' verisini alın

        this.dv.table.rows.forEach((row: any) => {
            names.push(row[0]);
            values.push(row[1]);
            periods.push(row[2]);
        });


        // Benzersiz periyotları al ve sırala
        let uniquePeriods = Array.from(new Set(periods)).sort((a, b) => a - b);

        // Sadece seçilen periyodun verilerini alın
        let filteredData = (period: any) => names.map((name: any, i: number) => {
            if (periods[i] === period) {
                return {
                    name: name,
                    value: values[i]
                };
            }
        }).filter(d => d !== undefined);

        let createTreemap = (data: any) => {
            let groupedData = Array.from(d3.group
                (data, (d: { name: any; value: any; }) => d.name),
                ([key, value]) =>
                ({
                    key, value: d3.sum(value, (d: { name: any; value: any; }) => d.value)
                }));

            // En büyük değere sahip kategoriyi bul
            groupedData.sort((a, b) => b.value - a.value);

            // Toplam değeri hesaplayın
            let totalValue = d3.sum(groupedData, (d: { value: any; }) => d.value);

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
                .data(root.leaves(), (d: any) => d.data.key);

            nodes.exit().remove();

            let enterNodes = nodes.enter().append("g").attr("class", "node");

            enterNodes.append("rect")
                .attr("fill", (d: any) => color(d.data.key))
                .attr("x", (d: any) => d.x0)
                .attr("y", (d: any) => d.y0)
                .attr("width", (d: any) => d.x1 - d.x0)
                .attr("height", (d: any) => d.y1 - d.y0);

            // İsim
            enterNodes.append("text")
                .attr("class", "name")
                .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
                .attr("y", (d: any) => d.y0 + 20) // 20 piksel aşağı kaydır
                .text((d: any) => d.data.key);

            // Değer
            enterNodes.append("text")
                .attr("class", "value")
                .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
                .attr("y", (d: any) => d.y1 - 5) // 5 piksel yukarı kaydır
                .text((d: any) => d.data.value);

            // Yüzde
            enterNodes.append("text")
                .attr("class", "percentage")
                .attr("x", (d: any) => (d.x0 + d.x1) / 2) // X koordinatını düğümün ortasına ayarla
                .attr("y", (d: any) => (d.y0 + d.y1) / 2) // Y koordinatını düğümün ortasına ayarla
                .attr("text-anchor", "middle") // Metni ortala
                .style("font-weight", "bold") // Metni kalın yap
                .text((d: any) => `(${(d.data.value / totalValue * 100).toFixed(1)}%)`);

            // Mevcut düğümleri güncelle
            nodes.select("rect")
                .transition().duration(800)
                .attr("x", (d: any) => d.x0)
                .attr("y", (d: any) => d.y0)
                .attr("width", (d: any) => d.x1 - d.x0)
                .attr("height", (d: any) => d.y1 - d.y0);

            nodes.select("text.name")
                .transition().duration(800)
                .attr("x", (d: any) => d.x0 + 5)
                .attr("y", (d: any) => d.y0 + 20)
                .text((d: any) => d.data.key);

            nodes.select("text.value")
                .transition().duration(800)
                .attr("x", (d: any) => d.x0 + 5)
                .attr("y", (d: any) => d.y1 - 5)
                .text((d: any) => d.data.value);

            nodes.select("text.percentage")
                .transition().duration(800)
                .attr("x", (d: any) => (d.x0 + d.x1) / 2)
                .attr("y", (d: any) => (d.y0 + d.y1) / 2)
                .text((d: any) => `(${(d.data.value / totalValue * 100).toFixed(1)}%)`);
        };


        let animatePeriods = (periods: any[], index: number = 0) => {
            if (index < periods.length) {
                let currentPeriod = periods[index];
                let currentData = filteredData(currentPeriod);
                createTreemap(currentData);

                /* Otomatik olarak güncelleme için kod satırını açın (eklenti kullanmadan) */
                // this.animationTimeout = window.setTimeout(() => {
                //     animatePeriods(periods, index + 1);
                // }, this.getDisplaySettingsFromMetaData("duration") || 3000); // 3 saniye bekle
            }
        };

        // Otomatik animasyonu başlat
        animatePeriods(uniquePeriods);
    }
}
