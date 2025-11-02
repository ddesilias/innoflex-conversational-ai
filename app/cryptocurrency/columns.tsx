'use client'

import { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

export interface CoinSchema {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank?: number
  total_volume?: number
}

export const columns: ColumnDef<CoinSchema>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'image',
    header: '',
    cell: ({ row }) => (
      <div className="w-8 h-8 relative">
        <Image
          src={row.original.image}
          alt={`${row.original.name} logo`}
          fill
          sizes="32px"
          className="rounded-full object-contain"
          onError={e => {
            e.currentTarget.src = '/placeholder.svg?height=32&width=32'
          }}
        />
      </div>
    )
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex items-center">
        <span className="font-medium">{row.original.name}</span>
        <span className="ml-2 text-gray-500">
          {row.original.symbol.toUpperCase()}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'current_price',
    header: 'Current Price',
    cell: ({ row }) => (
      <span>${row.original.current_price?.toLocaleString() ?? 'N/A'}</span>
    )
  },
  {
    accessorKey: 'market_cap',
    header: 'Market Cap',
    cell: ({ row }) => (
      <span>${row.original.market_cap?.toLocaleString() ?? 'N/A'}</span>
    )
  },
  {
    accessorKey: 'total_volume',
    header: 'Total Volume',
    cell: ({ row }) => (
      <span>${row.original.total_volume?.toLocaleString() ?? 'N/A'}</span>
    )
  }
]
