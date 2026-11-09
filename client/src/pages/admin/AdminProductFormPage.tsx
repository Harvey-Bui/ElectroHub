import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ExternalLink, PackageX, TriangleAlert } from 'lucide-react';
import { useCreateProduct, useUpdateProduct } from '@/api/adminQueries';
import { ApiError, errorMessage } from '@/api/http';
import { useCategories, useProduct } from '@/api/queries';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { ProductForm } from '@/components/admin/ProductForm';
import { ButtonLink, EmptyState, Skeleton, SkeletonGroup, useToast } from '@/components/ui';
import { mapServerFieldErrors } from '@/lib/productForm';
import type { FieldErrors } from '@/lib/validation';

function useServerErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const toast = useToast();
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
      setErrors(mapServerFieldErrors(error.fieldErrors));
      toast.error('Check the highlighted fields');
    } else if (error instanceof ApiError && error.code === 'PRODUCT_EXISTS') {
      setErrors({ id: 'A product with this ID already exists. Choose another ID.' });
    } else {
      toast.error("Couldn't save the product", errorMessage(error));
    }
  };
  return { errors, clear: () => setErrors({}), onError };
}

export function AdminNewProductPage() {
  const categories = useCategories();
  const navigate = useNavigate();
  const toast = useToast();
  const server = useServerErrors();
  const create = useCreateProduct({
    onSuccess: (product) => {
      toast.success('Product created', product.name);
      navigate(`/admin/products/${product.id}/edit`, { replace: true });
    },
    onError: server.onError,
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Products"
        title="New product"
        actions={
          <ButtonLink to="/admin/products" variant="ghost" size="sm" leftIcon={<ArrowLeft />}>
            All products
          </ButtonLink>
        }
      />
      {categories.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <ProductForm
          mode="create"
          categories={categories.data ?? []}
          saving={create.isPending}
          serverErrors={server.errors}
          onSubmit={(input) => {
            server.clear();
            create.mutate(input);
          }}
        />
      )}
    </>
  );
}

export function AdminEditProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);
  const categories = useCategories();
  const toast = useToast();
  const server = useServerErrors();
  const update = useUpdateProduct({
    onSuccess: (p) => toast.success('Changes saved', p.name),
    onError: server.onError,
  });

  const back = (
    <ButtonLink to="/admin/products" variant="ghost" size="sm" leftIcon={<ArrowLeft />}>
      All products
    </ButtonLink>
  );

  if (product.isPending || categories.isPending) {
    return (
      <SkeletonGroup label="Loading product" className="flex flex-col gap-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[36rem] rounded-xl" />
      </SkeletonGroup>
    );
  }
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <EmptyState
        headingLevel="h2"
        icon={notFound ? <PackageX /> : <TriangleAlert />}
        title={notFound ? 'Product not found' : "We couldn't load this product"}
        description={notFound ? 'It may have been deleted.' : errorMessage(product.error)}
        actions={back}
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Edit product"
        title={product.data.name}
        description={<span className="eh-numeric">{product.data.id}</span>}
        actions={
          <>
            <ButtonLink
              to={`/products/${product.data.id}`}
              target="_blank"
              variant="secondary"
              size="sm"
              rightIcon={<ExternalLink />}
            >
              View in store<span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
            {back}
          </>
        }
      />
      {/* key: reset the form state when switching between products */}
      <ProductForm
        key={product.data.id}
        mode="edit"
        product={product.data}
        categories={categories.data ?? []}
        saving={update.isPending}
        serverErrors={server.errors}
        onSubmit={(input) => {
          server.clear();
          const { id: _id, ...fields } = input;
          update.mutate({ id: product.data.id, input: fields });
        }}
      />
    </>
  );
}
