import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-table-renderer',
  templateUrl: './table-renderer.component.html',
  styleUrls: ['./table-renderer.component.scss']
})
export class TableRendererComponent implements OnChanges, AfterViewInit {

  @Input() columns: string[] = [];
  @Input() data: Record<string, any>[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Record<string, any>>();
  displayedColumns: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['columns']) {
      this.displayedColumns = this.columns;
      this.dataSource.data = this.data;
      this.attachPaginatorAndSort();
    }
  }

  ngAfterViewInit(): void {
    this.attachPaginatorAndSort();
  }

  private attachPaginatorAndSort(): void {
    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  formatCell(value: any): string {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  }
}
