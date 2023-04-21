function coord_to_index0(coord::IntType, shape::IntType, stride::IntType)
    @inline
    return coord * stride
end
function coord_to_index0(coord::Colon, shape::IntType, stride::IntType)
    @inline
    return zero(stride)
end
function coord_to_index0(coord::IntType, shape::Tuple{}, stride::Tuple{})
    @inline
    return zero(coord)
end
function coord_to_index0(coord::IntType, @nospecialize(shape::Tuple),
                         @nospecialize(stride::Tuple))
    s, d = first(shape), first(stride)
    q, r = divrem(coord, product(s))
    return coord_to_index0(r, s, d) +
           coord_to_index0(q, Base.tail(shape), Base.tail(stride))
end
function coord_to_index0(@nospecialize(coord::Tuple), @nospecialize(shape::Tuple),
                         @nospecialize(stride::Tuple))
    return flatsum(map(coord_to_index0, coord, shape, stride))
end

@inline _offset(x::Colon) = x  # don't touch colons
@inline _offset(x) = x - one(x)
function coord_to_index(coord, shape, stride)
    return coord_to_index0(emap(_offset, coord), shape, stride) + static(1)
end

# defaul stride, compact + column major
function coord_to_index0_horner(coord::IntType, shape::IntType)
    @inline
    return coord
end
function coord_to_index0_horner(coord::Tuple{}, shape::Tuple{})
    @inline
    return static(0)
end
function coord_to_index0_horner(@nospecialize(coord::Tuple), @nospecialize(shape::Tuple))
    c, s = first(coord), first(shape)
    return c + s * coord_to_index0_horner(Base.tail(coord), Base.tail(shape))
end

function coord_to_index0(coord, shape)
    iscongruent(coord, shape) ||
        throw(DimensionMismatch("coord and shape are not congruent"))
    return coord_to_index0_horner(flatten(coord), flatten(shape))
end

function coord_to_index(coord, shape)
    return coord_to_index0(emap(_offset, coord), shape) + static(1)
end

### index_to_coord
function index_to_coord(index::IntType, shape::IntType, stride::IntType)
    @inline
    return ifelse(isone(shape), zero(stride),
                  ((index - one(index)) ÷ stride) % shape + one(index))
end
function index_to_coord(index::IntType, @nospecialize(shape::Tuple),
                        @nospecialize(stride::Tuple))
    length(shape) == length(stride) ||
        throw(DimensionMismatch("shape, and stride must have the same rank"))
    return tuple((index_to_coord(index, s, d) for (s, d) in zip(shape, stride))...)
end
function index_to_coord(index::IntType, @nospecialize(shape::Tuple), stride::IntType)
    return tuple((index_to_coord(index, s, d) for (s, d) in zip(shape,
                                                                compact_col_major(shape,
                                                                                  stride)))...)
end
function index_to_coord(@nospecialize(index::Tuple), @nospecialize(shape::Tuple),
                        stride::Tuple)
    length(index) == length(shape) == length(stride) ||
        throw(DimensionMismatch("index, shape, and stride must have the same rank"))
    return map(index_to_coord, index, shape, stride)
end

# default stride, compact + column major

function index_to_coord(index::IntType, shape::IntType)
    @inline
    return index
end
function index_to_coord(index::IntType, @nospecialize(shape::Tuple))
    return index_to_coord(index, shape, compact_col_major(shape, static(1)))
end
function index_to_coord(@nospecialize(index::Tuple), @nospecialize(shape::Tuple))
    length(index) == length(shape) ||
        throw(DimensionMismatch("index and shape must have the same rank"))
    return map(index_to_coord, index, shape)
end

"""
Transoform a coordinate in one shape to a coordinate in another shape.
"""
function coord_to_coord(@nospecialize(coord::Tuple), @nospecialize(src_shape::Tuple),
                        @nospecialize(dst_shape::Tuple))
    length(coord) == length(src_shape) == length(dst_shape) ||
        throw(DimensionMismatch("coord, shape1, and shape2 must have the same rank"))
    return map(coord_to_coord, coord, src_shape, dst_shape)
end
function coord_to_coord(coord, src_shape, dst_shape)
    return index_to_coord(coord_to_index(coord, src_shape), dst_shape)
end

struct LayoutLeft end
struct LayoutRight end

const GenColMajor = LayoutLeft
const GenRowMajor = LayoutRight

struct CompactLambda{Major} end

function compact(shape::Tuple, current::IntType, ::Type{LayoutLeft})
    return foldl(CompactLambda{LayoutLeft}(), shape; init=((), current))
end
function compact(shape::Tuple, current::IntType, ::Type{LayoutRight})
    return foldl(CompactLambda{LayoutRight}(), reverse(shape); init=((), current))
end
function compact(shape::IntType, current::IntType, ::Type{Major}) where {Major}
    return ifelse(isone(shape), (static(0), current), (current, current * shape))
end

function compact_major(shape::Tuple, current::Tuple, major::Type{Major}) where {Major}
    length(shape) == length(current) ||
        throw(DimensionMismatch("shape and current must have the same rank"))
    return map((s, c) -> compact_major(s, c, major), shape, current)
end
function compact_major(shape, current::IntType, major::Type{Major}) where {Major}
    return first(compact(shape, current, major))
end

function (::CompactLambda{LayoutLeft})(init, si)
    result = compact(si, init[2], LayoutLeft)
    return (append(init[1], result[1]), result[2])
end
function (::CompactLambda{LayoutRight})(init, si)
    result = compact(si, init[2], LayoutRight)
    return (prepend(init[1], result[1]), result[2])
end

compact_col_major(shape, current=static(1)) = compact_major(shape, current, LayoutLeft)
compact_row_major(shape, current=static(1)) = compact_major(shape, current, LayoutRight)

function compact_order(shape::Tuple, order::Tuple, old_shape, old_order)
    return let old_shape = old_shape, old_order = old_order
        map((x, y) -> compact_order(x, y, old_shape, old_order), shape, order)
    end
end
function compact_order(shape, order::IntType, old_shape, old_order)
    d = let order = order
        product(map((s, o) -> ifelse(o < order, product(s), static(1)), old_shape,
                    old_order))
    end
    return compact_col_major(shape, d)
end
function compact_order(shape, order)
    return compact_order(shape, order, tuple(flatten(shape)...), tuple(flatten(order)...))
end
function compact_order(shape, ::Type{LayoutLeft})
    return compact_col_major(shape)
end
function compact_order(shape, ::Type{LayoutRight})
    return compact_row_major(shape)
end
