import type { TableProps } from 'antd';
import type { ColumnGroupType, ColumnsType, ColumnType } from 'antd/es/table';

type DataIndexPath = string | number | readonly (string | number)[];

function getNestedValue(record: unknown, dataIndex: DataIndexPath): unknown {
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];

  return path.reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string | number, unknown>)[segment];
  }, record);
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function isColumnGroup<T extends object>(
  column: ColumnType<T> | ColumnGroupType<T>
): column is ColumnGroupType<T> {
  return 'children' in column;
}

export function withSorters<T extends object>(
  columns: Exclude<TableProps<T>['columns'], undefined>
) {
  const applySorter = (
    column: ColumnType<T> | ColumnGroupType<T>
  ): ColumnType<T> | ColumnGroupType<T> => {
    if (isColumnGroup(column)) {
      return {
        ...column,
        children: column.children.map(applySorter) as ColumnsType<T>
      };
    }

    if (column.sorter !== undefined || !column.dataIndex) {
      return column;
    }

    return {
      ...column,
      sorter: (left: T, right: T) => {
        const leftValue = getNestedValue(left, column.dataIndex as DataIndexPath);
        const rightValue = getNestedValue(right, column.dataIndex as DataIndexPath);
        return compareValues(leftValue, rightValue);
      }
    };
  };

  return columns.map(applySorter) as Exclude<TableProps<T>['columns'], undefined>;
}
