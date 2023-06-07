struct TrivialPred end
@inline Base.getindex(::TrivialPred, i) = true

function copyto_if!(dest::MoYeArray, src::MoYeArray, mask)
    copy_op = select_elementwise_copy(src, dest) # would select async copy if dest is shared memory and src is global memory
    @loopinfo unroll for i in One():size(src.layout)
        if mask[i]
            apply(copy_op, pointer(dest, i), pointer(src, i))
        end
    end
    return dest
end
function copyto_if!(copy_atom::AbstractCopyAtom, dest::MoYeArray{TD,1}, src::MoYeArray{TS,1}, mask) where {TD,TS}
    return apply(copy_atom, dest, src)
end
function copyto_if!(copy_atom::AbstractCopyAtom, dest::MoYeArray{TD,N}, src::MoYeArray{TS,N}, mask) where {TD,TS,N}
    src_v = group_modes(src, StaticInt{2}(), StaticInt{N}())
    dest_v = group_modes(dest, StaticInt{2}(), StaticInt{N}())
    @loopinfo unroll for i in One():size(src_v.layout, 2)
        if mask[i]
            apply(copy_atom, view(dest_v, :, i), view(src_v, :, i))
        end
    end
    return dest
end

@generated function copyto_vec!(dest::MoYeArray{TD}, src::MoYeArray{TS}, ::Type{TV}) where {TD,TS,TV}
    if (sizeof(TD) == sizeof(TS)) && sizeof(TV) > sizeof(TD)
        return quote
            src_v = recast(TV, src)
            dest_v = recast(TV, dest)
            #print("Vectorized copyto! from $(sizeof(TS)) bytes to $(sizeof(TV)) bytes")
            copy_op = select_elementwise_copy(src_v, dest_v)
            @loopinfo unroll for i in One():size(src_v.layout)
                apply(copy_op, pointer(dest_v, i), pointer(src_v, i))
            end
            return dest
        end
    else
        return quote
            copy_op = select_elementwise_copy(src, dest)
            @loopinfo unroll for i in One():size(src.layout)
                apply(copy_op, pointer(dest, i), pointer(src, i))
            end
            return dest
        end
    end
end

"""
    copyto!(dest::StaticNonOwningArray, src::StaticNonOwningArray)

Copy the contents of `src` to `dest`. The function automatically carries out potential
vectorization. In particular, while transferring data from global memory to shared memory,
it automatically initiates asynchronous copying, if your device supports so.

!!! note
    It should be used with @gc_preserve if `dest` or `src` is powered by an ArrayEngine.
"""
function Base.copyto!(dest::StaticNonOwningArray{TD}, src::StaticNonOwningArray{TS}) where {TD,TS}
    N = max_common_vector(src, dest)
    if N == One() || N == Zero()
        return copyto_if!(dest, src, TrivialPred())
    else
        vec_bits = N * sizeof(TS) * 8
        TV = uint_bit(static(min(128, vec_bits)))
        return copyto_vec!(dest, src, TV)
    end
    return dest
end

#=
Base.@assume_effects :terminates_globally function Base.copyto!(copy_atom::AbstractCopyAtom, dest::MoYeArray{TD,1}, src::MoYeArray{TS,1}) where {TD,TS}
    apply(copy_atom, dest, src)
    return dest
end
Base.@assume_effects :terminates_globally function Base.copyto!(copy_atom::AbstractCopyAtom, dest::MoYeArray{TD,2}, src::MoYeArray{TS,2}) where {TD,TS}
    @loopinfo unroll for i in One():size(src.layout, 2)
        apply(copy_atom, view(dest, :, i), view(src, :, i))
    end
    return dest
end
Base.@assume_effects :terminates_globally function Base.copyto!(copy_atom::AbstractCopyAtom, dest::MoYeArray{TD,N}, src::MoYeArray{TS,N}) where {TD,TS,N}
    src_v = group_modes(src, StaticInt{2}(), StaticInt{N}())
    dest_v = group_modes(dest, StaticInt{2}(), StaticInt{N}())
    copyto!(copy_atom, dest_v, src_v)
    return dest
end
=#

group_tail(l::Layout{2}) = l
group_tail(l::Layout{N}) where {N} = group(l, StaticInt{2}(), StaticInt{N}())


function generate_copy_atom_loops(dst, src, dst_layout, src_layout, n_src, n_dst, d=1)
    expr = Expr(:block)
    dst_v = Symbol(:dst_v_, d)
    src_v = Symbol(:src_v_, d)
    loop_var = Symbol(:i_, d)

    grouped_dst_layout = group_tail(dst_layout)
    grouped_src_layout = group_tail(src_layout)
    N = size(grouped_dst_layout, 2)

    push!(expr.args, :($dst_v = MoYeArray(pointer($dst), $grouped_dst_layout)))
    push!(expr.args, :($src_v = MoYeArray(pointer($src), $grouped_src_layout)))

    loop = Expr(:for, :($loop_var = One():$N))
    loopbody = Expr(:block)
    sliced_dst = Symbol(:sliced_dst_, d)
    sliced_src = Symbol(:sliced_src_, d)
    push!(loopbody.args, :($sliced_dst = view($dst_v, :, $loop_var)))
    push!(loopbody.args, :($sliced_src = view($src_v, :, $loop_var)))

    # here we use the fact that each slice has the same layout
    sliced_layout_dst = slice(grouped_dst_layout, (:, 1))
    sliced_layout_src = slice(grouped_src_layout, (:, 1))
    if typeof(size(sliced_layout_dst)) == n_dst || typeof((sliced_layout_src)) == n_src
        push!(loopbody.args, :(copyto_unpack!(copy_atom, $sliced_dst, $sliced_src)))
    else
        new_layout_dst = sliced_layout_dst[One()]
        new_layout_src = sliced_layout_src[One()]
        push!(loopbody.args, generate_copy_atom_loops(sliced_dst, sliced_src, new_layout_dst, new_layout_src, n_src, n_dst, d+1))
    end
    push!(loopbody.args, :($(Expr(:loopinfo, (Symbol("llvm.loop.unroll.enable"), 1)))))
    push!(loop.args, loopbody)
    push!(expr.args, loop)
    return expr
end

@generated function Base.copyto!(copy_atom::AbstractCopyAtom, dst::StaticMoYeArray, src::StaticMoYeArray)

    expr = generate_copy_atom_loops(:dst, :src,  layout(dst)(), layout(src)(), num_val_src(copy_atom), num_val_dst(copy_atom))
    return quote
        $expr
        return dst
    end
end
