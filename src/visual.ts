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
        names.push(row[0]);
        values.push(row[1]);
        periods.push(row[2]);
    });

    // Benzersiz periyotları al ve sırala
    let uniquePeriods = Array.from(new Set(periods)).sort((a, b) => a - b);

    // Sadece seçilen periyodun verilerini alın
    let filteredData = (period: any) => names.map((category: any, i: number) => {
        if (periods[i] === period) {
            return {
                category: category,
                value: values[i]
            };
        }
    }).filter(d => d !== undefined);

    let createTreemap = (data: any) => {
        let groupedData = Array.from(d3.group(data, (d: { category: any; value: any; }) => d.category), ([key, value]) => ({ key, value: d3.sum(value, (d: { category: any; value: any; }) => d.value) }));
    
        // En büyük değere sahip kategoriyi bul
        groupedData.sort((a, b) => b.value - a.value);
    
        // En büyük kategoriyi listenin başına taşı
        let maxCategoryIndex = groupedData.findIndex(item => item.value === groupedData[0].value);
        let maxCategory = groupedData.splice(maxCategoryIndex, 1)[0];
        groupedData.unshift(maxCategory);
    
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
    
        enterNodes.append("text")
            .attr("class", "category")
            .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
            .attr("y", (d: any) => d.y0 + 20) // 20 piksel aşağı kaydır
            .text((d: any) => d.data.key); // İsim
    
        enterNodes.append("text")
            .attr("class", "value")
            .attr("x", (d: any) => d.x0 + 5) // 5 piksel sağa kaydır
            .attr("y", (d: any) => d.y1 - 5) // 5 piksel yukarı kaydır
            .text((d: any) => d.data.value); // Değer
    
        enterNodes.append("text")
            .attr("class", "percentage")
            .attr("x", (d: any) => (d.x0 + d.x1) / 2) // X koordinatını düğümün ortasına ayarla
            .attr("y", (d: any) => (d.y0 + d.y1) / 2) // Y koordinatını düğümün ortasına ayarla
            .attr("text-anchor", "middle") // Metni ortala
            .style("font-weight", "bold") // Metni kalın yap
            .text((d: any) => `(${(d.data.value / totalValue * 100).toFixed(1)}%)`); // Yüzde
    
        // Mevcut düğümleri güncelle
        nodes.select("rect")
            .transition().duration(800)
            .attr("x", (d: any) => d.x0)
            .attr("y", (d: any) => d.y0)
            .attr("width", (d: any) => d.x1 - d.x0)
            .attr("height", (d: any) => d.y1 - d.y0);
    
        nodes.select("text.category")
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
    

    let animatePeriods = (periods: any[]) => {
        let currentPeriodIndex = 0;
        let targetPeriodIndex = 1;
        let currentData = filteredData(periods[currentPeriodIndex]);
        let targetData = filteredData(periods[targetPeriodIndex]);
        let totalSteps = 100; // Toplam adım sayısı
        let currentStep = 0;
        let intervalDuration = 30; // Interval süresi (ms cinsinden)
    
        // İki periyot arasındaki farkı hesapla
        let currentValues = currentData.map((d: any) => d.value);
        let targetValues = targetData.map((d: any) => d.value);
        let valueDifferences = currentValues.map((value: number, i: number) => targetValues[i] - value);
    
        let interval = setInterval(() => {
            if (currentStep < totalSteps) {
                // Her adımda yeni değerleri hesapla ve treemap'i güncelle
                let stepPercentage = currentStep / totalSteps;
                let interpolatedValues = currentValues.map((value: number, i: number) => value + valueDifferences[i] * stepPercentage);
                let interpolatedData = currentData.map((d: any, i: number) => ({ ...d, value: interpolatedValues[i] }));
                createTreemap(interpolatedData);
                currentStep++;
            } else if (targetPeriodIndex < periods.length) {
                // Hedef periyoda ulaşıldığında aralığı güncelle ve yeni periyoda geç
                currentPeriodIndex++;
                targetPeriodIndex++;
                currentData = filteredData(periods[currentPeriodIndex]);
                targetData = filteredData(periods[targetPeriodIndex]);
                currentValues = currentData.map((d: any) => d.value);
                targetValues = targetData.map((d: any) => d.value);
                valueDifferences = currentValues.map((value: number, i: number) => targetValues[i] - value);
                currentStep = 0;
    
                // Değerler arasında değişiklik kontrolü
                if (currentValues.some((value, i) => value !== targetValues[i])) {
                    // Büyük olanın en başa gelmesi için sıralama işlemi yapılır
                    targetData.sort((a: any, b: any) => b.value - a.value);
                    createTreemap(targetData);
                }
            } else {
                clearInterval(interval);
            }
        }, intervalDuration); // Interval süresi (ms cinsinden)
    };
    
    
    
    
    

    // Otomatik animasyonu başlat
    animatePeriods(uniquePeriods);
}


}
