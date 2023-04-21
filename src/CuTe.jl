module CuTe

using Reexport
using Static: StaticInt, IntType, static
import Static
@reexport using Static: static, is_static
using ManualMemory, LayoutPointers
using CUDA
using Core: LLVMPtr
import Adapt

include("algorithm/tuple_algorithms.jl")
include("int_tuple.jl")
include("stride.jl")
include("layout.jl")
include("print.jl")
include("container/engine.jl")
include("cutearray.jl")
include("algorithm/array_algorithms.jl")

include("device/array.jl")

export flatten
export colex_less, elem_less, increment, capacity
export coord_to_index, index_to_coord, coord_to_coord, compact_col_major, compact_row_major,
       GenColMajor, GenRowMajor, @Layout
export Layout, make_layout, shape, rank, depth, cosize, complement, logical_product,
       blocked_product, raked_product, zipped_product, logical_divide, zipped_divide,
       tiled_divide
export print_layout
export ArrayEngine, ViewEngine, CuTeArray, make_fragment_like

end
